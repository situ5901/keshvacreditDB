const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("🚫 MongoDB Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

const TOKEN_API_URL = "https://vnotificationgw.uat.pointz.in/v1/auth/token";
const LEAD_CREATE_API_URL =
  "https://vnotificationgw.uat.pointz.in/v1/leads/loans/create";
const BATCH_SIZE = 1; // increase in prod
function buildLeadPayload(doc) {
  return {
    client_request_id: doc.client_request_id ?? `REQ${Date.now()}`,
    name: {
      first: doc.first_name ?? "John",
      middle: doc.middle_name ?? "William",
      last: doc.last_name ?? "Doe",
    },
    phone_number: doc.phone ?? "9876543210",
    email: doc.email ?? "john.doe@example.com",
    pan: doc.pan ?? "PPPPP0000P",
    dob: "1990-01-01",
    current_address: {
      pincode: String(doc.pincode ?? "400001"), // 🔧 fix here
    },
    employment_details: {
      employment_type: doc.employment_type ?? "SALARIED",
      monthly_income: doc.monthly_income ?? "75000",
    },
    loan_requirement: {
      desired_loan_amount: doc.desired_loan_amount ?? "500000",
    },
    custom_fields: {},
    evaluation_type: "BASIC",
  };
}

async function getAuthToken() {
  try {
    const body = {
      client_id: "keshvacredit",
      client_secret: "AW21Bu)jQ15eiDf[",
    };

    const { data } = await axios.post(TOKEN_API_URL, body, {
      headers: { "Content-Type": "application/json" },
    });

    const token = data?.auth_token ?? data?.data?.auth_token;
    if (!token)
      throw new Error(`Unexpected token response: ${JSON.stringify(data)}`);
    console.log("✅ Token generated");
    return token;
  } catch (err) {
    console.error("❌ Token error:", err.response?.data || err.message);
    throw err;
  }
}

async function createLeads() {
  const token = await getAuthToken();

  const docs = await UserDB.find({ pushed_to_api: { $ne: true } })
    .limit(BATCH_SIZE)
    .lean();

  if (!docs.length) return console.log("ℹ️  No new leads to push.");

  const payloads = docs.map(buildLeadPayload);

  for (const payload of payloads) {
    try {
      const { data } = await axios.post(LEAD_CREATE_API_URL, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("✅ Lead pushed:", data);
      await UserDB.updateOne(
        { client_request_id: payload.client_request_id },
        { $set: { pushed_to_api: true } },
      );
    } catch (err) {
      console.error(
        "❌ Lead push error:",
        err.response?.data || err.message,
        "\nPayload:",
        payload,
      );
    }
  }
}

createLeads();
