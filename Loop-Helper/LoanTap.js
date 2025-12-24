const axios = require("axios");
const mongoose = require("mongoose");
const crypto = require("crypto");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

// Connect Mongo
mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "LoanTap",
  new mongoose.Schema({}, { collection: "LoanTap", strict: false }),
);

// Meta Model (Not used now but kept)
const MetaDB = mongoose.model(
  "Meta",
  new mongoose.Schema({
    key: String,
    value: mongoose.Schema.Types.Mixed,
  }),
);

// LoanTap Auth
const partnerKey = "iDWUDj8oljS9XHeHXzsJCGViewdHRUiR";
const iv = Buffer.alloc(16, 0);

// Success Count
let successCount = 0;
const SUCCESS_LIMIT = 5000;

// Generate X-API-AUTH
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

const API_URL = "https://api.loantap.in/v1-application/dist";
const Partner_id = "Keshvacredit";

// Convert DOB
function convertDobToYYYYMMDD(dob) {
  if (!dob) return null;
  let date = typeof dob === "string" ? new Date(dob) : dob;
  if (!(date instanceof Date) || isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

// Send data to LoanTap
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

    const response = await axios.post(
      API_URL,
      { add_application: applicant },
      {
        headers: getHeaders(),
      },
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
    return {
      status: "failed",
      message: error.response?.data?.message || "API error",
      rawResponse: error.response?.data || null,
    };
  }
}

async function processBatch(users) {
  const results = await Promise.allSettled(
    users.map(async (user) => {
      const result = await sendToNewAPI(user);

      if (result.message === "Application created successfully") {
        successCount++;
        console.log(`🎉 Success Count: ${successCount}`);

        if (successCount >= SUCCESS_LIMIT) {
          console.log("🚨 5000 Successful Hits Complete. Stopping Process...");
          throw new Error("STOP_PROCESS");
        }
      }

      await UserDB.updateOne(
        { phone: user.phone },
        {
          $push: {
            apiResponse: {
              LoanTap: {
                fullResponse: result.rawResponse?.add_application?.answer,
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

async function runAllLeads() {
  try {
    let hasMore = true;
    let totalLeadsProcessed = 0;
    const BATCH_SIZE = 5;

    console.log("🚀 Starting Lead Processing...");

    while (hasMore) {
      console.log(`\n🔍 Fetching next batch (Size: ${BATCH_SIZE})...`);

      const leads = await UserDB.aggregate([
        { $match: { "RefArr.name": { $ne: "LoanTap" } } },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("🚫 No more leads. Exiting...");
        break;
      }

      try {
        console.log(`✨ Processing batch of ${leads.length} leads...`);
        await processBatch(leads);

        totalLeadsProcessed += leads.length;
        console.log(`📊 Total Leads Processed: ${totalLeadsProcessed}`);
      } catch (err) {
        if (err.message === "STOP_PROCESS") {
          console.log("🚨 Process stopped after reaching 5000 success.");
          break;
        } else {
          console.error("❗ Unexpected Error:", err);
        }
      }

      await new Promise((res) => setTimeout(res, 500));
    }
  } finally {
    await new Promise((res) => setTimeout(res, 500));
    mongoose.connection.close();
    console.log("🔒 MongoDB connection closed. Process Finished.");
  }
}

runAllLeads();
