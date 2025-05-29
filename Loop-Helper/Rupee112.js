const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

const MAX_LEADS = 500;
let processedCount = 0;

const primaryAPI = "https://api.rupee112fintech.com/marketing-check-dedupe/";
const fallbackAPI = "https://api.rupee112fintech.com/marketing-push-data/";

function getHeaders() {
  return {
    Username: "KESHVACREDIT_20250421",
    Authorization:
      "Basic a154c75adc5c96003c740668545c8ed59ff99f5ee520e8feb4b8087a41b2eb2a",
    "Content-Type": "application/json",
  };
}

async function sendToNewAPI(lead) {
  try {
    const apiRequestBody = {
      mobile: lead.phone,
      pancard: lead.pan,
    };

    console.log("📤 Sending Lead Data to Primary API:", apiRequestBody);
    let response = await axios.post(primaryAPI, apiRequestBody, {
      headers: getHeaders(),
    });

    let responseData = response.data;

    // 🔁 If user not found, call the fallback API
    if (
      responseData.Status === "2" &&
      responseData.Message === "User not found"
    ) {
      console.log(
        "⚠️ User not found in Primary API. Sending to Fallback API...",
      );

      try {
        const fallbackResponse = await axios.post(fallbackAPI, apiRequestBody, {
          headers: getHeaders(),
        });

        console.log("✅ Fallback API Response:", fallbackResponse.data);
        responseData = {
          ...fallbackResponse.data,
          fallbackUsed: true,
        };
      } catch (fallbackError) {
        console.error("🚫 Fallback API Call Failed:", fallbackError.message);
        responseData = {
          Status: 0,
          Error:
            fallbackError.response?.data?.Error ||
            fallbackError.response?.statusText ||
            "Unknown fallback API error",
          fallbackUsed: true,
        };
      }
    }

    console.log("✅ Final API Response Received:", responseData);
    return responseData;
  } catch (error) {
    console.error("🚫 Primary API Call Failed:", error.message);
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
      console.log("🚫 No more leads to process.");
    } else {
      await processBatch(leads);
      processedCount += leads.length;
      console.log(`✅ Total Processed: ${processedCount}`);
    }
  } catch (error) {
    console.error("🚫 Error in loop:", error.message, error);
  } finally {
    console.log("🔚 Closing MongoDB connection...");
    mongoose.connection.close();
  }
}
loop();
