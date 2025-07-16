// lead‑push.js
const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const { MONGODB_SITU, POINTZ_CLIENT_ID, POINTZ_CLIENT_SECRET } = process.env;

// 1️⃣ MongoDB ----------------------------------------------------------
await mongoose.connect(MONGODB_SITU);
console.log("✅ MongoDB connected");

const User = mongoose.model(
  "Component", // fixed spelling
  new mongoose.Schema({}, { collection: "Componant", strict: false }),
);

// 2️⃣ Helper -----------------------------------------------------------
const buildLeadPayload = (doc) => ({
  client_request_id: doc.client_request_id || `REQ${doc._id}`,
  name: {
    first: doc.first_name || "John",
    middle: doc.middle_name || "William",
    last: doc.last_name || "Doe",
  },
  phone_number: doc.phone || "9876543210",
  email: doc.email || "john.doe@example.com",
  pan: doc.pan || "PPPPP0000P",
  dob: doc.dob || "1990-01-01",
  current_address: { pincode: String(doc.pincode || "400001") },
  employment_details: {
    employment_type: doc.employment_type || "SALARIED",
    monthly_income: doc.monthly_income || "75000",
  },
  loan_requirement: {
    desired_loan_amount: doc.desired_loan_amount || "500000",
  },
  custom_fields: {},
  evaluation_type: "BASIC",
});

// 3️⃣ Get auth token ---------------------------------------------------
async function getAuthToken() {
  const { data } = await axios.post(
    "https://vnotificationgw.uat.pointz.in/v1/auth/token",
    { client_id: POINTZ_CLIENT_ID, client_secret: POINTZ_CLIENT_SECRET },
    { headers: { "Content-Type": "application/json" } },
  );
  const token = data?.auth_token ?? data?.data?.auth_token;
  if (!token) throw new Error(`Bad token response ${JSON.stringify(data)}`);
  console.log("✅ Token generated");
  return token;
}

// 4️⃣ Push leads -------------------------------------------------------
const BATCH_SIZE = 50; // feel free to raise
async function createLeads() {
  const token = await getAuthToken();
  const docs = await User.find({ pushed_to_api: { $ne: true } })
    .limit(BATCH_SIZE)
    .lean();

  if (!docs.length) return console.log("ℹ️  No new leads to push.");

  for (const doc of docs) {
    const payload = buildLeadPayload(doc);
    try {
      const { data } = await axios.post(
        "https://vnotificationgw.uat.pointz.in/v1/leads/loans/create",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Treat “lead already exists” the same as success
      const ok =
        data?.status?.code === 200 ||
        data?.status?.code === 101 ||
        data?.status === "SUCCESS";

      if (ok) {
        await User.updateOne(
          { _id: doc._id }, // ✅ match by _id
          {
            $set: {
              pushed_to_api: true,
              client_request_id: payload.client_request_id,
            },
          },
        );
      }

      console.log(`✅ Lead result (${doc._id}):`, data);
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

createLeads().then(() => mongoose.disconnect());
