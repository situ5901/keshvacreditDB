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
        client_request_id: "REQ123456789",
        name: {
          first: "John",
          middle: "William",
          last: "Doe",
        },
        phone_number: "9816543210",
        email: "johndoe@example.com",
        pan: "ZXYPP9876R",
        dob: "1990-01-15",
        current_address: {
          pincode: "400001",
        },
        employment_details: {
          employment_type: "SALARIED",
          monthly_income: "75000",
        },
        loan_requirement: {
          desired_loan_amount: "500000",
        },
        custom_fields: {
          utm_source: "whatsapp",
          agent_code: "ALT001",
          ref_campaign: "july-loan",
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
