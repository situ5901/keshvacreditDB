const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;
const TOKEN_API_URL = "https://vnotificationgw.uat.pointz.in/v1/auth/token";
const LEAD_CREATE_API_URL =
  "https://vnotificationgw.uat.pointz.in/v1/leads/loans/create";
const BATCH_SIZE = 1;

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("🚫 MongoDB Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

async function getAuthToken() {
  try {
    const payload = {
      client_id: "keshvacredit",
      client_secret: "AW21Bu)jQ15eiDf[",
    };
    const { data } = await axios.post(TOKEN_API_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("🔸 Token Response:", JSON.stringify(data, null, 2));

    const token = data?.auth_token || data?.data?.auth_token;
    if (!token) throw new Error("❌ Token missing in response");

    return token;
  } catch (err) {
    console.error("❌ Token error:", err.response?.data || err.message);
    throw err;
  }
}

async function pushLeads(token) {
  try {
    const docs = await UserDB.find().limit(BATCH_SIZE);

    for (const doc of docs) {
      const payload = {
        client_request_id: "REQ202507160001", // updated unique ID
        name: {
          first: "Rahul",
          middle: "Kumar",
          last: "Sharma",
        },
        phone_number: "9898989898", // new phone
        email: "rahul.sharma@example.com", // new email
        pan: "ABCPP1234A", // new valid PAN (4th letter = P)
        dob: "1992-03-10", // changed DOB
        current_address: {
          pincode: "110001", // Delhi CP pincode (for example)
        },
        employment_details: {
          employment_type: "SALARIED",
          monthly_income: "85000", // new income
        },
        loan_requirement: {
          desired_loan_amount: "350000", // new loan amount
        },
        custom_fields: {
          utm_source: "google_ads", // new UTM
          agent_code: "AGT777", // new agent code
          ref_campaign: "monsoon-offer-2025", // new campaign
        },
        evaluation_type: "BASIC",
      };
      console.log("📤 Sending Payload to API:", payload);

      const response = await axios.post(LEAD_CREATE_API_URL, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(`✅ Lead Pushed for ${doc.phone || "N/A"}`);
      console.log(
        "📦 Full API Response:\n",
        JSON.stringify(response.data, null, 2),
      );
    }
  } catch (error) {
    console.error("❌ Lead push error:", error.response?.data || error.message);
  }
}

// Main function
(async () => {
  try {
    const token = await getAuthToken();
    await pushLeads(token);
    mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
