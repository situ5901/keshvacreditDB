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
  try {
    const payload = {
      client_id: "keshvacredit",
      client_secret: "AW21Bu)jQ15eiDf[", // Ensure this is the correct secret for UAT
    };

    const response = await axios.post(TOKEN_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Check the response structure based on the provided Epifi documentation
    if (response.data.status && response.data.status.code === 0) {
      console.log("✅ Token generated successfully:", response.data.auth_token);
      return response.data.auth_token;
    } else {
      console.error(
        "❌ Error generating token:",
        response.data.status
          ? response.data.status.message
          : "Unknown error or unexpected response structure",
      );
      return null;
    }
  } catch (error) {
    console.error(
      "❌ Token generation failed:",
      error.response ? error.response.data : error.message,
    );
    return null;
  }
}
sendToToken();
