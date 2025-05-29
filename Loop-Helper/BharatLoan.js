const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

const DEDUPE_API_URL =
  "https://api.rupee112fintech.com/marketing-check-dedupe/";
const MARKETING_PUSH_API_URL =
  process.env.MARKETING_PUSH_API_URL ||
  "https://api.rupee112fintech.com/marketing-push-data/";

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

function getHeaders() {
  return {
    Username: "KESHVACREDIT_20250421",
    Auth: "a154c75adc5c96003c740668545c8ed59ff99f5ee520e8feb4b8087a41b2eb2a",
    "Content-Type": "application/json",
  };
}

async function sendToDedupeAPI(lead) {
  try {
    const apiRequestBody = {
      mobile: lead.phone,
      pancard: lead.pan,
    };
    console.log("📤 Sending Lead Data to Dedupe API:", apiRequestBody);
    const apiResponse = await axios.post(DEDUPE_API_URL, apiRequestBody, {
      headers: getHeaders(),
    });
    console.log("✅ Dedupe API Response Received:", apiResponse.data);
    return apiResponse.data;
  } catch (error) {
    console.error(
      "🚫 Dedupe API Call Failed for",
      lead.phone,
      ":",
      error.message,
    );
    return {
      Status: 0,
      Error:
        error.response?.data?.Error ||
        error.response?.statusText ||
        "Unknown Dedupe API error",
    };
  }
}

async function sendToMarketingPushAPI(lead) {
  try {
    const apiRequestBody = {
      full_name: lead.full_name || "",
      mobile: lead.phone,
      mobile_verification_flag: "0",
      email: lead.email || "",
      pancard: lead.pan,
      pincode: lead.pincode || "",
      income_type: lead.income_type || "",
      purpose_of_loan: lead.purpose_of_loan || "",
      monthly_salary: lead.monthly_salary || "",
      loan_amount: lead.loan_amount || "",
      customer_lead_id: lead.customer_lead_id || `cm-${lead._id.toString()}`,
    };
    console.log("📤 Sending Lead Data to Marketing Push API:", apiRequestBody);
    const apiResponse = await axios.post(
      MARKETING_PUSH_API_URL,
      apiRequestBody,
      {
        headers: getHeaders(),
      },
    );
    console.log("✅ Marketing Push API Response Received:", apiResponse.data);
    return apiResponse.data;
  } catch (error) {
    console.error(
      "🚫 Marketing Push API Call Failed for",
      lead.phone,
      ":",
      error.message,
    );
    return {
      Status: 0,
      Error:
        error.response?.data?.Error ||
        error.response?.statusText ||
        "Unknown Marketing Push API error",
    };
  }
}

async function processBatch(users) {
  const promises = users.map(async (user) => {
    const dedupeResponse = await sendToDedupeAPI(user);
    const pushResponse = await sendToMarketingPushAPI(user);
    return { user, dedupeResponse, pushResponse };
  });

  const results = await Promise.all(promises);

  for (const { user, dedupeResponse, pushResponse } of results) {
    console.log(`📦 Updating DB for ${user.phone} with responses:`, {
      dedupeResponse,
      pushResponse,
    });

    try {
      const updateResponse = await UserDB.updateOne(
        { phone: user.phone },
        {
          $push: {
            apiResponse: {
              rupee112Dedupe: dedupeResponse,
              marketingPushData: pushResponse,
              createdAt: new Date().toISOString(),
            },
            RefArr: [
              {
                name: "Rupee112Dedupe",
                createdAt: new Date().toISOString(),
              },
              {
                name: "Rupee112Push",
                createdAt: new Date().toISOString(),
              },
            ],
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
            "RefArr.name": { $ne: "Rupee112Push" },
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
    await loop();
  } catch (err) {
    console.error("🚫 MongoDB Connection Error in main:", err);
    process.exit(1);
  }
}

main();
