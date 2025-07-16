const axios = require("axios");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

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
    const tokenAPIs = await axios.post(TokenAPIs, payload, {
         headers: { "Content-Type": "application/json" },
    }
    res.send(tokenAPIs);
    const token = tokenAPIs?.auth_token ?? tokenAPIs?.data?.auth_token;
    if (!token)
        throw new Error(`Unexpected token response: ${JSON.stringify(tokenAPIs)}`);
    console.log("✅ Token generated");
    return token;
    } catch (err) {
        console.error("❌ Token error:", err.response?.data || err.message);
        throw err;			
    }
}

getAuthToken();







    // client_request_id: doc.client_request_id ?? `REQ${Date.now()}`,
    // name: {
    //   first: doc.first_name ?? "John",
    //   middle: doc.middle_name ?? "William",
    //   last: doc.last_name ?? "Doe",
    // },
    // phone_number: doc.phone ?? "9876543210",
    // email: doc.email ?? "john.doe@example.com",
    // pan: doc.pan ?? "PPPPP0000P",
    // dob: "1990-01-01",
    // current_address: {
    //   pincode: String(doc.pincode ?? "400001"), // 🔧 fix here
    // },
    // employment_details: {
    //   employment_type: doc.employment_type ?? "SALARIED",
    //   monthly_income: doc.monthly_income ?? "75000",
    // },
    // loan_requirement: {
    //   desired_loan_amount: doc.desired_loan_amount ?? "500000",
    // },
    // custom_fields: {},
    // evaluation_type: "BASIC",
