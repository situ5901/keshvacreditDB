const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

// MongoDB connection
const MONGODB_URINEW = process.env.MONGODB_URINEW;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "loops",
  new mongoose.Schema({}, { collection: "loops", strict: false }),
);

// Request headers
function getHeaders() {
  return {
    "Content-Type": "application/json",
    "X-API-AUTH": "ykbls6i8o0gphxCX5fz5KQ==",
    "REQ-PRODUCT-ID": "lt-personal-term-loan-reducing",
    "PARTNER-ID": "dummy-pl",
  };
}

const API_URL = "https://prod.thearks.in/v1-application/transact";
const MAX_LEADS = 1;
const Partner_id = "Keshvacredit";

// API Submission
async function sendToNewAPI(lead) {
  try {
    const applicant = {
      job_type: lead.employment,
      full_name: lead.name,
      personal_email: lead.email,
      mobile_number: lead.phone,
      dob: lead.dob?.replaceAll("-", ""),
      gender: lead.gender,
      pan_card: lead.pan,
      loan_city: lead.state,
      fixed_income: lead.income,
      Partner_id: Partner_id,
      consent_given: "yes",
      consent_given_timestamp: new Date()
        .toISOString()
        .replace("T", " ")
        .slice(0, 19),
    };

    const requestBody = {
      add_application: applicant,
    };

    console.log("📤 Sending Lead:", applicant.mobile_number);

    const response = await axios.post(API_URL, requestBody, {
      headers: getHeaders(),
    });

    console.log("✅ API Success:", response.data);

    return {
      status: response.data?.add_application?.answer?.status || "unknown",
      message: response.data?.add_application?.answer?.message || "No message",
    };
  } catch (error) {
    console.error("❌ API Error:", error.response?.data || error.message);

    return {
      status: "failed",
      message: error.response?.data?.message || "API error",
    };
  }
}

// Process and update leads
async function processBatch(users) {
  const results = await Promise.allSettled(
    users.map(async (user) => {
      const existingUser = await UserDB.findOne({ phone: user.phone });
      if (existingUser?.isSentToAPI) {
        console.log(`⏭️ Skipping ${user.phone}, already processed.`);
        return { status: "skipped", message: "Already sent" };
      }

      const result = await sendToNewAPI(user);

      await UserDB.updateOne(
        { phone: user.phone },
        {
          $push: {
            apiResponse: {
              salaryOnTime: result,
              message: result.message,
              createdAt: new Date().toISOString(),
            },
            RefArr: {
              name: "salaryOnTime",
              createdAt: new Date().toISOString(),
            },
          },
          $set: { isSentToAPI: true },
          $unset: { accounts: "" },
        },
      );

      console.log(`✅ Mongo Updated: ${user.phone}`);
      return result;
    }),
  );

  return results;
}

// Batch loop
let processedCount = 0;
async function loop() {
  try {
    let hasMore = true;
    while (hasMore) {
      console.log("🔍 Fetching leads...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            processed: { $ne: true },
            "RefArr.name": { $ne: "salaryOnTime" },
            isSentToAPI: { $ne: true },
          },
        },
        { $limit: MAX_LEADS },
      ]);

      if (leads.length === 0) {
        hasMore = false;
        console.log("🚫 No more leads to process.");
      } else {
        await processBatch(leads);
        processedCount += leads.length;
        console.log(`📊 Total Processed: ${processedCount}`);
        await new Promise((res) => setTimeout(res, 1000));
      }
    }
  } catch (err) {
    console.error("❗ Loop Error:", err.message);
  } finally {
    mongoose.connection.close();
    console.log("🔒 MongoDB connection closed.");
  }
}

// Start the loop
loop();
