const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

// MongoDB connection
const MONGODB_URINEW = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("🚫 MongoDB Connection Error:", err);
    process.exit(1);
  });

// MongoDB model
const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

const MAX_LEADS = 5;
let processedCount = 0;

// API config
const newAPI = "https://api.rupee112fintech.com/marketing-check-dedupe/";

function getHeaders() {
  return {
    Username: "KESHVACREDIT_20250421",
    Auth: "a154c75adc5c96003c740668545c8ed59ff99f5ee520e8feb4b8087a41b2eb2a",
    "Content-Type": "application/json",
  };
}

// Send data to external API
async function sendToNewAPI(lead) {
  try {
    const apiRequestBody = {
      mobile: lead.phone,
      pancard: lead.pan,
    };

    console.log("📤 Sending Lead Data to API:", apiRequestBody);

    const apiResponse = await axios.post(newAPI, apiRequestBody, {
      headers: getHeaders(),
    });

    console.log("✅ API Response Received:", apiResponse.data);
    return apiResponse.data;
  } catch (error) {
    console.error("🚫 API Call Failed:", error.message);

    return {
      Status: 0,
      Error:
        error.response?.data?.Error ||
        error.response?.statusText ||
        "Unknown API error",
    };
  }
}

// Process a batch of leads
async function processBatch(users) {
  const promises = users.map((user) => sendToNewAPI(user));
  const results = await Promise.all(promises);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const response = results[i];

    console.log(`📦 Updating DB for ${user.phone} with response:`, response);

    try {
      const updateResponse = await UserDB.updateOne(
        { phone: user.phone },
        {
          $push: {
            apiResponse: {
              rupee112: response,
              Status: response.Status,
              message: response.Message || response.Error || "",
              createdAt: new Date().toISOString(),
            },
            RefArr: {
              name: "Rupee112",
              createdAt: new Date().toISOString(),
            },
          },
          $unset: { accounts: "" },
        },
      );

      console.log(`✅ MongoDB updated for ${user.phone}:`, updateResponse);
    } catch (updateError) {
      console.error(
        `🚫 Failed to update MongoDB for ${user.phone}:`,
        updateError,
      );
    }
  }
}

// Loop through batches
async function loop() {
  try {
    let hasMoreLeads = true;

    while (hasMoreLeads) {
      console.log("🔄 Fetching users...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $ne: "Rupee112" },
          },
        },
        { $limit: MAX_LEADS },
      ]);

      if (leads.length === 0) {
        hasMoreLeads = false;
        console.log("🚫 No more leads to process.");
      } else {
        await processBatch(leads);
        processedCount += leads.length;
        console.log(`✅ Total Processed: ${processedCount}`);
      }

      // Wait 2 seconds between batches
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error("🚫 Error in loop:", error.message, error);
  } finally {
    console.log("🔚 Closing MongoDB connection...");
    mongoose.connection.close();
  }
}

loop();
