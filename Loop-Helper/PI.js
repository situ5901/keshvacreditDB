const express = require("express");
const app = express();
const mongoose = require("mongoose");
const axios = require("axios");
const baseURL = "https://test.com";
const MONGODB_URIVISH = process.env.MONGODB_URIVISH;
mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

const BATCH_SIZE = 100;
const PartnerID = "Keshvacredit";
const baseURL = "https://test.com";

async function sendToToken() {
  try {
    const payload = {
      client_id: "keshvacredit",
      client_secret: "keshvacredit",
    };

    const response = await axios.post(baseURL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic cmFtZXM6cmFtZXM=",
      },
    });

    if (response.data.message === "Success") {
      console.log("✅ Token generated successfully:", response.data.token);
      return response.data.token;
    } else {
      console.error("❌ Error generating token:", response.data.message);
      return null;
    }
  } catch (error) {
    console.error("❌ Token generation failed:", error.message);
    return null;
  }
}

async function LeadAPIs(lead, token) {
  try {
    const payload = {
      client_request_id: "REQ123456789",
      name: {
        first: lead.name,
      },
      phone_number: lead.phone,
      email: lead.email,
      pan: lead.pan,
      dob: lead.dob,
      current_address: {
        pincode: lead.pincode,
      },
      employment_details: {
        employment_type: lead.employment,
        monthly_income: lead.income,
      },
      loan_requirement: {
        desired_loan_amount: "500000",
      },
      custom_fields: {},
      evaluation_type: "BASIC",
    };

    const response = await axios.post(
      baseURL, // Replace with real API
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    console.log("✅ Lead API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Error in LeadAPIs:",
      error.response ? error.response.data : error.message,
    );
    throw error;
  }
}

async function processBatch(users, token) {
  await Promise.all(
    users.map(async (user) => {
      const userDoc = await UserDB.findOne({ phone: user.phone });
      if (userDoc?.RefArr?.some((ref) => ref.name === "PI")) {
        console.log(`⚠️ Skipping ${user.phone} (already processed)`);
        return;
      }

      const leadResponse = await LeadAPIs(user, token);

      const updateDoc = {
        $push: {
          apiResponse: {
            PI: leadResponse,
            status: leadResponse.status,
            message: leadResponse.available_lender_types,
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: "PI",
            createdAt: new Date().toISOString(),
          },
        },
        $unset: { accounts: "" },
      };

      await UserDB.updateOne({ phone: user.phone }, updateDoc);
      console.log(`✅ DB updated for: ${user.phone}`);
    }),
  );
}

async function Loop() {
  const token = await sendToToken();
  if (!token) {
    console.log("❌ Token missing. Aborting...");
    return;
  }

  async function processNextBatch() {
    try {
      console.log("\n🔎 Looking for new leads...");
      const leads = await UserDB.aggregate([
        { $match: { "RefArr.name": { $ne: "PI" } } },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("⏸️ No unprocessed leads. Retrying in 2 seconds...");
        return setTimeout(processNextBatch, 2000);
      }

      await processBatch(leads, token);
      console.log(`✅ Processed batch of ${leads.length} users`);
      setImmediate(processNextBatch);
    } catch (err) {
      console.error("❌ Error in processing:", err.message);
      return setTimeout(processNextBatch, 3000); // retry later
    }
  }
  processNextBatch();
}
Loop();
