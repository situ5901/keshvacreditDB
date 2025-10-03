const axios = require("axios");
const mongoose = require("mongoose");
const crypto = require("crypto");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

// MongoDB Models
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

// Variables for API Authentication
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
const Partner_id = "Keshvacredit"; // Used in request body

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

    console.log("📤 Sending Payload to API for:", lead.phone);

    const response = await axios.post(API_URL, requestBody, {
      headers: getHeaders(),
    });
    console.log(
      "📥 API Response Status:",
      response.data?.add_application?.answer?.status,
    );

    const status = response.data?.add_application?.answer?.status || "unknown";
    const message =
      response.data?.add_application?.answer?.message || "No message";

    return {
      status,
      message,
      rawResponse: response.data,
    };
  } catch (error) {
    console.error(
      "❌ API Error for",
      lead.phone,
      ":",
      error.response?.data || error.message,
    );
    return {
      status: "failed",
      message: error.response?.data?.message || "API error",
      rawResponse: error.response?.data || null,
    };
  }
}

// ✅ Process one batch of users (using Promise.allSettled)
async function processBatch(users) {
  // Promise.allSettled ensures that all API calls are made,
  // even if some fail, and then proceeds.
  const results = await Promise.allSettled(
    users.map(async (user) => {
      const result = await sendToNewAPI(user);

      await UserDB.updateOne(
        { phone: user.phone },
        {
          $push: {
            apiResponse: {
              LoanTap: {
                fullResponse: result.rawResponse.add_application.answer,
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
      console.log(`✅ Mongo Updated: ${user.phone}`);
      return result;
    }),
  );

  return results;
}

// ✅ Main execution function (Batch size set to 100)
async function runAllLeads() {
  try {
    let hasMore = true;
    let totalLeadsProcessed = 0;

    // --- YAHAN BATCH SIZE 100 KAR DIYA GAYA HAI ---
    const BATCH_SIZE = 1;
    // ----------------------------------------------

    console.log("🚀 Starting lead processing with a batch size of 100...");

    while (hasMore) {
      console.log(`\n🔍 Fetching next batch of leads (Size: ${BATCH_SIZE})...`);

      // Fetch leads that have not been sent to LoanTap yet
      const leads = await UserDB.aggregate([
        { $match: { "RefArr.name": { $ne: "LoanTap" } } },
        { $limit: BATCH_SIZE }, // 100 leads at a time
      ]);

      if (leads.length === 0) {
        hasMore = false;
        console.log("🚫 No more leads to process. Stopping.");
      } else {
        console.log(`✨ Processing batch of ${leads.length} leads...`);
        // ProcessBatch calls Promise.allSettled for parallel API hits (100 at once)
        await processBatch(leads);

        totalLeadsProcessed += leads.length;
        console.log(
          `📊 Total Leads Processed in this run: ${totalLeadsProcessed}`,
        );

        // Thoda sa delay tak ki API ko overload na ho (optional)
        await new Promise((res) => setTimeout(res, 500));
      }
    }
  } catch (err) {
    console.error("❗ Main Process Error:", err.message);
  } finally {
    // Wait a moment to ensure all updates are written before closing
    await new Promise((res) => setTimeout(res, 500));
    mongoose.connection.close();
    console.log("🔒 MongoDB connection closed. Process finished.");
  }
}

// ✅ Start
runAllLeads();
