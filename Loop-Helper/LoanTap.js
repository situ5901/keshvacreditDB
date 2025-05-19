const axios = require("axios");
const mongoose = require("mongoose");
const crypto = require("crypto");
require("dotenv").config();

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

const partnerKey = "p1JZ8ljtVxJfxLs5eS43Z7jJL81lRzDC"; // example

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

// Headers function
function getHeaders() {
  return {
    "Content-Type": "application/json",
    "X-API-AUTH": generateXApiAuth(),
    "REQ-PRODUCT-ID": "lt-personal-term-loan-reducing",
    "PARTNER-ID": "dummy-pl",
  };
}

const API_URL = "https://prod.thearks.in/v1-application/transact";
const MAX_LEADS = 1;
const Partner_id = "Keshvacredit";

// Function to send lead data to API
async function sendToNewAPI(lead) {
  try {
    function convertDateFormat(dob) {
      const [month, day, year] = dob.split("/");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    const applicant = {
      job_type: lead.employment?.toLowerCase() || "",
      full_name: lead.name?.toLowerCase() || "",
      personal_email: lead.email?.toLowerCase() || "",
      mobile_number: String(lead.phone),
      dob: convertDateFormat(lead.dob),
      gender: lead.gender?.toLowerCase() || "",
      pan_card: lead.pan?.toLowerCase() || "",
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
    const requestBody = {
      add_application: applicant,
    };

    console.log("📤 Sending Lead:", applicant.mobile_number);

    const response = await axios.post(API_URL, requestBody, {
      headers: getHeaders(),
    });

    console.log("✅ API Success:", response.data);

    // Extract status and message from the response
    const status = response.data.add_application.answer.status;
    const message = response.data.add_application.answer.message;

    return {
      status: status,
      message: message,
    };
  } catch (error) {
    console.error("❌ API Error:", error.response?.data || error.message);

    return {
      status: "failed",
      message: error.response?.data?.message || "API error",
    };
  }
}

// Process leads batch
async function processBatch(users) {
  const results = await Promise.allSettled(
    users.map(async (user) => {
      const existingUser = await UserDB.findOne({ phone: user.phone });

      const result = await sendToNewAPI(user);

      // Update MongoDB with the API response status and message
      await UserDB.updateOne(
        { phone: user.phone },
        {
          $set: {
            "apiResponse.LoanTap": {
              message: result.message,
              status: result.status,
              createdAt: new Date().toISOString(),
            },
          },
          $push: {
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

// Main loop to fetch and process leads continuously
let processedCount = 0;
async function loop() {
  try {
    let hasMore = true;
    while (hasMore) {
      console.log("🔍 Fetching leads...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $ne: "LoanTap" },
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

// Start processing
loop();
