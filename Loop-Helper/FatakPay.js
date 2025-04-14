const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

// MongoDB connection string from .env file
const MONGODB_URI = process.env.MONGODB_URI;

// MongoDB connection
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

// MongoDB Schema and Model
const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

// Constants
const BATCH_SIZE = 1;
const MAX_LEADS = 5;
const CREATE_USER_TOKEN_API =
  "https://uatonboardingapi.fatakpay.com/external-api/v1/create-user-token";
const ELIGIBILITY_API =
  "https://uatonboardingapi.fatakpay.com/external-api/v1/emi-insurance-eligibility";

// Function to generate user token
async function createUserToken() {
  try {
    const payloads = {
      username: "KeshvaCredit",
      password: "38fccc61f934bc49343c",
    };

    const response = await axios.post(CREATE_USER_TOKEN_API, payloads, {
      headers: { "Content-Type": "application/json" },
    });

    // ✅ Debugging raw response
    console.log("🔥 Raw Token API Response:", response.data);

    // Correct status check based on actual API response
    if (response.data.success && response.data.data?.token) {
      console.log("✅ Token generated successfully:", response.data.data.token);
      return response.data.data.token;
    } else {
      console.error("❌ Error generating token:", response.data.message);
      return null;
    }
  } catch (err) {
    console.error("❌ Create User Token API Error:", err.message);
    return null;
  }
}

// Function to send EMI Insurance Eligibility Check
async function sendEligibilityCheck(user, token) {
  try {
    const mobile = user.phone;
    const name = user.name;
    const email = user.email;
    const employeeType = user.employment;
    const dob = user.dob;
    const pan = user.pan;
    const pincode = user.pincode;

    // Constructing the payload
    const payload = {
      mobile: mobile,
      first_name: name,
      last_name: user.last_name || "", // Handling missing last name
      employment_type_id: employeeType,
      pan: pan,
      dob: dob,
      email: email,
      pincode: pincode,
      consent: true,
      consent_timestamp: new Date().toISOString(), // Current timestamp in ISO format
    };

    // Debugging the payload before sending
    console.log("📤 Sending Eligibility Check Payload:", payload);

    // Sending the POST request to the API
    const response = await axios.post(ELIGIBILITY_API, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // Debugging the response
    console.log("📥 Eligibility Check Response:", response.data);

    // Returning the response data
    return response.data;
  } catch (err) {
    // Improved error handling
    const errorMessage = err.response?.data || err.message || "Unknown error";
    console.error("❌ Eligibility API Error:", errorMessage);
    return { status: "FAILED", message: errorMessage }; // Returning a more comprehensive error
  }
}

// Process batch of leads
async function processBatch(users, token) {
  for (let user of users) {
    const userDoc = await UserDB.findOne({ phone: user.phone });

    if (userDoc?.RefArr?.some((ref) => ref.name === "FatakPay")) {
      console.log(`⚠️ Skipping ${user.phone} as FatakPay is already present`);
      continue;
    }

    const eligibilityResponse = await sendEligibilityCheck(user, token);

    const updateDoc = {
      $push: {
        apiResponse: {
          FatakPay: true,
          status: eligibilityResponse.success ? "Eligible" : "Ineligible",
          message: eligibilityResponse.message,
          createdAt: new Date().toISOString(),
        },
        RefArr: {
          name: "FatakPay",
          createdAt: new Date().toISOString(),
        },
      },
    };

    await UserDB.updateOne({ phone: user.phone }, updateDoc);
    console.log(`✅ Updated user: ${user.phone}`);
  }
}

// Loop process for leads
async function Loop() {
  let processedCount = 0;
  let hasMoreLeads = true;
  let token = null;

  try {
    // Get token first
    token = await createUserToken();
    if (!token) {
      console.log("❌ Could not generate token. Exiting process.");
      return;
    }

    while (hasMoreLeads && processedCount < MAX_LEADS) {
      console.log("🔍 Fetching leads...");

      const leads = await UserDB.aggregate([
        { $match: { "RefArr.name": { $ne: "FatakPay" } } },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        hasMoreLeads = false;
        console.log("✅ No more leads to process.");
      } else {
        await processBatch(leads, token);
        processedCount += leads.length;

        console.log(`📝 Total Processed: ${processedCount}`);

        if (processedCount >= MAX_LEADS) {
          console.log("✅ Limit reached. Ending process.");
          hasMoreLeads = false;
        } else {
          console.log("⏳ Waiting 5 seconds before next batch...");
          await new Promise((resolve) => setTimeout(resolve, 5000)); // Increased delay to avoid hitting rate limits
        }
      }
    }
  } catch (error) {
    console.error("❌ Error occurred:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

Loop();
