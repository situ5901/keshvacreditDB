const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MAX_LEADS = 500;
const loan_amount = "20000";
const partner_id = "keshvacredit";
const DEDUPE_API = "https://api.rupee112fintech.com/marketing-check-dedupe/";
const PRE_APPROVAL_API = "https://api.rupee112fintech.com/marketing-push-data/";

let processedCount = 0;

const MONGODB_URINEW = process.env.MONGODB_URINEW;
mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

// MongoDB Model
const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
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
    console.error("🚫 Dedupe API Error:", error.message);
    return {
      Status: 0,
      Error:
        error.response?.data?.Error ||
        error.response?.statusText ||
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
      loan_amount: loan_amount,
      partner_id: partner_id,
    };

    console.log("📤 Sending Lead to Pre-Approval API:", payload);

    const response = await axios.post(PRE_APPROVAL_API, payload, {
      headers: getHeaders(),
    });

    console.log("✅ Pre-Approval API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("🚫 Pre-Approval API Error:", error.message);
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
  for (let user of users) {
    const dedupeRes = await sendDedupeAPI(user);
    let preApprovalRes = null;

    if (dedupeRes.Status === 2 && dedupeRes.message === "User not found") {
      // Call second API if user not found
      preApprovalRes = await sendPreApprovalAPI(user);
    }

    // Prepare update
    const updatePayload = {
      $push: {
        apiResponse: {
          rupee112: dedupeRes,
          ...(preApprovalRes && { preApproval112: preApprovalRes }),
          Status: preApprovalRes?.Status || dedupeRes.Status,
          message:
            dedupeRes.message ||
            dedupeRes.Error ||
            preApprovalRes?.message ||
            preApprovalRes?.Error ||
            "",
          createdAt: new Date().toISOString(),
        },
        RefArr: {
          name: "BharatLoan",
          createdAt: new Date().toISOString(),
        },
      },
      $unset: { accounts: "" },
    };

    // Update MongoDB
    try {
      const updateResponse = await UserDB.updateOne(
        { phone: user.phone },
        updatePayload,
      );
      console.log(`✅ MongoDB Updated for ${user.phone}:`, updateResponse);
    } catch (err) {
      console.error(`🚫 Failed to update MongoDB for ${user.phone}:`, err);
    }
  }
}

async function loop() {
  try {
    console.log("🔄 Fetching users...");
    const leads = await UserDB.aggregate([
      { $match: { "RefArr.name": { $ne: "BharatLoan" } } },
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
    console.error("🚫 Error in loop:", error.message);
  } finally {
    console.log("🔚 Closing MongoDB connection...");
    mongoose.connection.close();
  }
}
loop();
