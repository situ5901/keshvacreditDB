const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;
const TOKEN_API_URL = "https://vnotificationgw.uat.pointz.in/v1/auth/token";
const LEAD_CREATE_API_URL =
  "https://vnotificationgw.uat.pointz.in/v1/leads/loans/create";
const BATCH_SIZE = 1; // increase in prod

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("🚫 MongoDB Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

// const BATCH_SIZE = 1;
const TokenAPIs = "https://vnotificationgw.uat.pointz.in/v1/auth/token";
const LeadCreateAPIs =
  "https://vnotificationgw.uat.pointz.in/v1/leads/loans/create";

async function getAuthToken() {
  try {
    const payload = {
      client_id: "keshvacredit",
      client_secret: "AW21Bu)jQ15eiDf[",
    };

    const { data } = await axios.post(TokenAPIs, payload, {
      headers: { "Content-Type": "application/json" },
    });

    const token = data?.auth_token || data?.data?.auth_token;
    if (!token) {
      throw new Error(`❌ Token missing in response: ${JSON.stringify(data)}`);
    }
    return token;
    console.log("✅ Token generated successfully");
    return token;
  } catch (err) {
    console.error("❌ Token error:", err.response?.data || err.message);
    throw err;
  }
}

getAuthToken();
