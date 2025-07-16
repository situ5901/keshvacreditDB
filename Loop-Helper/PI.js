const axios = require("axios");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config(); // <--- ADD THIS LINE

const MONGODB_SITU = process.env.MONGODB_SITU;

mongoose
  .connect(MONGODB_SITU)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "Componant",
  new mongoose.Schema({}, { collection: "Componant", strict: false }),
);

const TokenAPIs = "https://vnotificationgw.uat.pointz.in/v1/auth/token";
// const LeadCreateAPIs = "https://vnotificationgw.uat.pointz.in/v1/leads/loans/create";
//
const BATCH_SIZE = 1;
async function getAuthToken() {
  try {
    const payload = {
      client_id: "keshvacredit",
      client_secret: "AW21Bu)jQ15eiDf[",
    };
    const response = await axios.post(TokenAPIs, payload, {
      headers: { "Content-Type": "application/json" },
    });
    response.data;
  } catch (err) {
    console.error("❌ Token error:", err.response?.data || err.message);
    throw err;
  }
}

getAuthToken();
