const mongoose = require("mongoose");
const axios = require("axios");
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

const BATCH_SIZE = 1; // You might want to increase this for production
const TOKEN_API_URL = "https://vnotificationgw.uat.pointz.in/v1/auth/token";
const LEAD_CREATE_API_URL =
  "https://vnotificationgw.uat.pointz.in/v1/leads/loans/create"; // Uncommented this line, as it was commented out in your snippet

async function sendToToken() {
  console.log("🔄 Requesting auth token...");
  try {
    const payload = {
      client_id: "keshvacredit",
      client_secret: "AW21Bu)jQ15eiDf[",
    };

    const { data } = await axios.post(TOKEN_API_URL, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15_000, // good practice
    });

    // --- Normalise response --------------------------------------------
    const statusCode = data?.status?.code ?? data?.code ?? -1;
    const statusMsg = data?.status?.message ?? data?.message ?? "Unknown";
    const tokenInRoot = data?.auth_token;
    const tokenInData = data?.data?.auth_token ?? data?.data?.token;
    const authToken = tokenInRoot || tokenInData;
    // -------------------------------------------------------------------

    if (statusCode === 0 && authToken) {
      console.log("✅ Token generated successfully:", authToken);
      return authToken;
    }

    // If we reach here, the API didn’t give us a usable token
    console.error(`❌ API responded with code ${statusCode}: ${statusMsg}`);
    console.error("Full payload:", JSON.stringify(data, null, 2));
    return null;
  } catch (err) {
    console.error(
      "❌ Token generation failed:",
      err.response ? err.response.data : err.message,
    );
    return null;
  }
}

sendToToken();
