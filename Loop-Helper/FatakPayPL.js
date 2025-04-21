const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

const BATCH_SIZE = 1;
const MAX_LEADS = 10000;
const CREATE_USER_TOKEN_API =
  "https://onboardingapi.fatakpay.com/external-api/v1/create-user-token";
const ELIGIBILITY_API =
  "https://onboardingapi.fatakpay.com/external-api/v1/emi-insurance-eligibility";

async function createUserToken() {
  try {
    const payloads = {
      username: "KeshvaCredit",
      password: "df9786e1ee29910713cc",
    };

    const response = await axios.post(CREATE_USER_TOKEN_API, payloads, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("🔥 Raw Token API Response:", response.data);

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

async function sendEligibilityCheck(user, token) {
  try {
    const payload = {
      mobile: user.phone,
      first_name: user.name,
      last_name: user.last_name || "kumar",
      employment_type_id: user.employment,
      pan: user.pan || null,
      dob: user.dob || null,
      email: user.email || null,
      pincode: user.pincode || null,
      home_address: user.home_address || "123 MG Road, Mumbai",
      office_address:
        user.office_address || "ABC Pvt Ltd, Andheri East, Mumbai",
      emp_code: user.emp_code || "EMP12345",
      type_of_residence: user.type_of_residence || "Owned",
      company_name: user.company_name || "ABC Pvt Ltd",
      consent: true,
      consent_timestamp: new Date().toISOString(),
    };

    console.log("📤 Sending Eligibility Check Payload:", payload);

    const response = await axios.post(ELIGIBILITY_API, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`, // Corrected header like cURL
      },
    });

    console.log("📥 Eligibility Check Response:", response.data);
    return response.data;
  } catch (err) {
    const errorMessage = err.response?.data || err.message || "Unknown error";
    console.error("❌ Eligibility API Error:", errorMessage);
    return { status: "FAILED", message: errorMessage };
  }
}

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
          data: eligibilityResponse.data || {},
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

async function Loop() {
  let processedCount = 0;
  let hasMoreLeads = true;
  let token = null;

  try {
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
          await new Promise((resolve) => setTimeout(resolve, 1000));
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
