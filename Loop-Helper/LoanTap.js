const axios = require("axios");
const mongoose = require("mongoose");
const crypto = require("crypto");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "LoanTap",
  new mongoose.Schema({}, { collection: "LoanTap", strict: false }),
);

const MetaDB = mongoose.model(
  "Meta",
  new mongoose.Schema({
    key: String,
    value: mongoose.Schema.Types.Mixed,
  }),
);

const partnerKey = "iDWUDj8oljS9XHeHXzsJCGViewdHRUiR"; // example
const iv = Buffer.alloc(16, 0);

function generateXApiAuth() {
  const epochSeconds = Math.floor(Date.now() / 1000).toString();
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(partnerKey, "utf8"),
    iv,
  );
  let encrypted = cipher.update(epochSeconds, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "X-API-AUTH": generateXApiAuth(),
    "REQ-PRODUCT-ID": "lt-personal-term-loan-reducing",
    "PARTNER-ID": "keshvacredit",
  };
}

const API_URL = "https://loantap.in/v1-application/transact";
const MAX_LEADS = 1;
const Partner_id = "Keshvacredit";

function convertDobToYYYYMMDD(dob) {
  if (!dob) return null;
  let date = typeof dob === "string" ? new Date(dob) : dob;
  if (!(date instanceof Date) || isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

// ✅ Send data to LoanTap API
async function sendToNewAPI(lead) {
  try {
    const applicant = {
      job_type: lead.employment?.toLowerCase() || "",
      full_name: lead.name?.toLowerCase() || "",
      personal_email: lead.email?.toLowerCase() || "",
      mobile_number: String(lead.phone),
      dob: convertDobToYYYYMMDD(lead.dob),
      gender: lead.gender?.toLowerCase() || "",
      pan_card: lead.pan,
      home_zipcode: lead.pincode,
      loan_city: lead.state?.toLowerCase() || "",
      fixed_income: lead.income,
      Partner_id: Partner_id,
      consent_given: "yes",
      consent_given_timestamp: new Date()
        .toISOString()
        .replace("T", " ")
        .slice(0, 19),
    };

    const requestBody = { add_application: applicant };

    console.log("📤 Sending Lead:", applicant.mobile_number);

    const response = await axios.post(API_URL, requestBody, {
      headers: getHeaders(),
    });

    const status = response.data?.add_application?.answer?.status || "unknown";
    const message =
      response.data?.add_application?.answer?.message || "No message";

    return {
      status,
      message,
      rawResponse: response.data,
    };
  } catch (error) {
    console.error("❌ API Error:", error.response?.data || error.message);
    return {
      status: "failed",
      message: error.response?.data?.message || "API error",
      rawResponse: error.response?.data || null,
    };
  }
}

// ✅ Process one batch of users
async function processBatch(users) {
  const results = await Promise.allSettled(
    users.map(async (user) => {
      const result = await sendToNewAPI(user);

      await UserDB.updateOne(
        { phone: user.phone },
        {
          $push: {
            apiResponse: {
              LoanTap: {
                message: result.message,
                status: result.status,
                fullResponse: result.rawResponse,
                createdAt: new Date().toISOString(),
              },
            },
            RefArr: {
              name: "LoanTap",
              createdAt: new Date().toISOString(),
            },
          },
          $unset: { accounts: "" },
        },
      );
//situ
      console.log(`✅ Mongo Updated: ${user.phone}`);
      return result;
    }),
  );

  return results;
}

// ✅ Daily count helpers
async function getDailyCount() {
  const today = new Date().toISOString().split("T")[0];
  let record = await MetaDB.findOne({ key: "loantap_daily_counter" });

  if (!record || record.value.date !== today) {
    await MetaDB.updateOne(
      { key: "loantap_daily_counter" },
      { $set: { value: { date: today, count: 0 } } },
      { upsert: true },
    );
    return 0;
  }

  return record.value.count;
}

async function incrementDailyCount(by = 1) {
  const today = new Date().toISOString().split("T")[0];
  await MetaDB.updateOne(
    { key: "loantap_daily_counter" },
    {
      $inc: { "value.count": by },
      $set: { "value.date": today },
    },
    { upsert: true },
  );
}

// ✅ Main loop with 10,000 daily limit
let processedCount = 0;
async function loop() {
  try {
    let hasMore = true;

    while (hasMore) {
      const currentCount = await getDailyCount();

      if (currentCount >= 10000) {
        console.log("✅ Daily limit reached (10,000). Waiting for next day...");
        break;
      }

      const batchSize = Math.min(MAX_LEADS, 10000 - currentCount);
      console.log("🔍 Fetching leads...");

      const leads = await UserDB.aggregate([
        { $match: { "RefArr.name": { $ne: "LoanTap" } } },
        { $limit: batchSize },
      ]);

      if (leads.length === 0) {
        hasMore = false;
        console.log("🚫 No more leads to process.");
      } else {
        await processBatch(leads);
        await incrementDailyCount(leads.length);
        processedCount += leads.length;
        console.log(`📊 Total Processed Today: ${currentCount + leads.length}`);
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

// ✅ Start
loop();
