const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

// MongoDB connection
mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

const MAX_LEADS = 5;
let processedCount = 0;
const newAPI = "https://api.rupee112fintech.com/marketing-check-dedupe/";

function getHeaders() {
  return {
    Username: "KESHVACREDIT_20250421",
    Auth: "98d206c1c728c9af5ee6ed32edee63e0",
    "Content-Type": "application/json",
  };
}
//add new leads to the database
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

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error("🚫 Error in loop:", error.message, error);
  } finally {
    console.log("🔚 Closing MongoDB connection...");
    mongoose.connection.close();
  }
}

async function main() {
  try {
    await mongoose.connect(MONGODB_URINEW);
    console.log("✅ MongoDB Connected Successfully");
    await loop();
  } catch (err) {
    console.error("🚫 MongoDB Connection Error:", err);
    process.exit(1);
  }
}

main();
