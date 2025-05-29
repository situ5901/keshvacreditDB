const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MAX_LEADS = 500;
const LOAN_AMOUNT = "20000";
const PARTNER_ID = "keshvacredit";
const DEDUPE_API = "https://api.rupee112fintech.com/marketing-check-dedupe/";
const PRE_APPROVAL_API = "https://api.rupee112fintech.com/marketing-push-data/";

let processedCount = 0;
const MONGODB_URI = process.env.MONGODB_URIVISH;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

function getHeaders() {
  return {
    Username: "KESHVACREDIT_20250421",
    Authorization:
      "Basic a154c75adc5c96003c740668545c8ed59ff99f5ee520e8feb4b8087a41b2eb2a",
    "Content-Type": "application/json",
  };
}

async function sendDedupeAPI(lead) {
  try {
    const apiRequestBody = {
      mobile: lead.phone,
      pancard: lead.pan,
    };
    console.log("📤 Sending Lead to Dedupe API:", apiRequestBody);

    const response = await axios.post(DEDUPE_API, apiRequestBody, {
      headers: getHeaders(),
    });

    console.log("✅ Dedupe API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("🚫 Dedupe API Error:", error.message, error.response?.data);
    return {
      Status: 0,
      Error:
        error.response?.data?.Error ||
        error.response?.data?.message ||
        error.response?.statusText ||
        error.message ||
        "Unknown API error",
    };
  }
}

async function sendPreApprovalAPI(lead) {
  try {
    const payload = {
      full_name: lead.name || "Unknown",
      email: lead.email,
      mobile: lead.phone,
      pancard: lead.pan,
      pincode: lead.pincode,
      income_type: lead.income,
      loan_amount: LOAN_AMOUNT,
      partner_id: PARTNER_ID,
    };

    console.log("📤 Sending Lead to Pre-Approval API:", payload);

    const response = await axios.post(PRE_APPROVAL_API, payload, {
      headers: getHeaders(),
    });

    console.log("✅ Pre-Approval API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "🚫 Pre-Approval API Error:",
      error.message,
      error.response?.data,
    );
    return {
      Status: 0,
      Error:
        error.response?.data?.Error ||
        error.response?.data?.message ||
        error.response?.statusText ||
        error.message ||
        "Unknown API error",
    };
  }
}

async function processBatch(users) {
  for (let user of users) {
    console.log(`🔍 Processing: ${user.phone}`);

    const dedupeRes = await sendDedupeAPI(user);
    let preApprovalRes = null;

    if (dedupeRes.Status === 2 && dedupeRes.Message === "User not found") {
      console.log(`➡️ Hitting Pre-Approval API for ${user.phone}`);
      preApprovalRes = await sendPreApprovalAPI(user);
    }

    const updatePayload = {
      $push: {
        apiResponse: {
          rupee112: dedupeRes,
          ...(preApprovalRes && { preApproval112: preApprovalRes }),
          Status: preApprovalRes?.Status || dedupeRes.Status,
          message:
            preApprovalRes?.message ||
            preApprovalRes?.Error ||
            dedupeRes.message ||
            dedupeRes?.Error ||
            "No specific message",
          createdAt: new Date().toISOString(),
        },
        RefArr: {
          name: "Rupee112",
          createdAt: new Date().toISOString(),
        },
      },
      $unset: { accounts: "" },
    };

    try {
      const updateResponse = await UserDB.updateOne(
        { phone: user.phone },
        updatePayload,
      );
      console.log(`✅ MongoDB Updated for ${user.phone}:`, updateResponse);
    } catch (err) {
      console.error(`🚫 Failed to update MongoDB for ${user.phone}:`, err);
    }

    try {
      await UserDB.updateOne(
        { phone: user.phone },
        { $set: { processed: true } },
      );
      console.log(`✅ Marked as processed: ${user.phone}`);
    } catch (err) {
      console.error(`🚫 Failed to mark as processed for ${user.phone}:`, err);
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
          processed: { $ne: true },
        },
      },
      { $limit: MAX_LEADS },
    ]);

    if (leads.length === 0) {
      console.log("🚫 No more leads to process.");
    } else {
      console.log(`📦 Found ${leads.length} leads to process.`);
      await processBatch(leads);
      processedCount += leads.length;
      console.log(`✅ Total Processed: ${processedCount}`);
    }
  } catch (error) {
    console.error("🚫 Error in loop:", error.message);
  } finally {
    console.log("🔚 Closing MongoDB connection...");
    await mongoose.connection.close();
  }
}

loop();
