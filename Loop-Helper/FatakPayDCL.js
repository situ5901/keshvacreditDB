const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false })
);

const BATCH_SIZE = 20;
const CREATE_USER_TOKEN_API =
  "https://onboardingapi.fatakpay.com/external-api/v1/create-user-token";
const ELIGIBILITY_API =
  "https://onboardingapi.fatakpay.com/external-api/v1/emi-insurance-eligibility";

// ----------------- Create Token -----------------
async function createUserToken() {
  try {
    const payloads = {
      username: "KeshvaCredit",
      password: "a5df9f760eb280c878b4",
    };

    const response = await axios.post(CREATE_USER_TOKEN_API, payloads, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("\n🎟️ Token API Raw Response:", JSON.stringify(response.data, null, 2));

    if (response.data.success && response.data.data?.token) {
      console.log("✅ Token generated successfully:", response.data.data.token);
      return response.data.data.token;
    } else {
      console.error("❌ Error generating token:", response.data.message);
      return null;
    }
  } catch (err) {
    console.error("❌ Token API Error:", err.message);
    return null;
  }
}

// ----------------- Eligibility Check -----------------
async function sendEligibilityCheck(user, token) {
  try {
    const payload = {
      mobile: user.phone,
      first_name: user.name,
      last_name: user.last_name || "kumar",
      employment_type_id: user.employment,
      pan: user.pan || null,
      dob: user.dob ? new Date(user.dob).toISOString().split("T")[0] : null,
      email: user.email || "not@provided.com",
      pincode: user.pincode || "400001",
      home_address: user.home_address || "123 MG Road, Mumbai",
      office_address:
        user.office_address || "ABC Pvt Ltd, Andheri East, Mumbai",
      emp_code: user.emp_code || "EMP12345",
      type_of_residence: user.type_of_residence || "Owned",
      consent: true,
      consent_timestamp: new Date().toISOString(),
    };

    console.log(`\n📤 Sending Eligibility for: ${user.phone}`);
    console.log("➡️ Payload:", payload);

    const response = await axios.post(ELIGIBILITY_API, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
    });

    console.log("📥 Eligibility API Raw Response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (err) {
    const errorMessage = err.response?.data || err.message || "Unknown error";
    console.error("❌ Eligibility API Error:", errorMessage);
    return { success: false, message: errorMessage };
  }
}

// ----------------- Eligibility with Auto Token Refresh -----------------
// ----------------- Eligibility with Auto Token Refresh -----------------
async function sendEligibilityCheckWithAutoToken(user, tokenRef) {
  let response = await sendEligibilityCheck(user, tokenRef.token);

  // Agar token expired error aaya (401 ya message me expired likha ho)
  if (
    response?.status_code === 401 ||
    response?.message?.toLowerCase().includes("token expired")
  ) {
    console.log("🔄 Token expired detected. Regenerating token...");
    const newToken = await createUserToken();
    if (!newToken) {
      console.error("❌ Token regeneration failed");
      return { success: false, message: "Token regeneration failed" };
    }
    tokenRef.token = newToken; // update token
    console.log("🔁 Retrying eligibility check with new token...");
    response = await sendEligibilityCheck(user, tokenRef.token);
  }

  return response;
}

// ----------------- Process Batch -----------------
async function processBatch(users, tokenRef) {
  const promises = users.map(async (user) => {
    console.log(`\n🔄 Processing user: ${user.phone}`);

    const userDoc = await UserDB.findOne({ phone: user.phone });

    if (userDoc?.RefArr?.some((ref) => ref.name === "FatakPayDCL")) {
      console.log(`⚠️ Skipping ${user.phone} (already processed)`);
      return;
    }

    const eligibilityResponse = await sendEligibilityCheckWithAutoToken(user, tokenRef);

    const updateDoc = {
      $push: {
        apiResponse: {
          FatakPayDCL: true,
          status: eligibilityResponse.success ? "Eligible" : "Ineligible",
          message: eligibilityResponse.message,
          data: eligibilityResponse.data || {},
          createdAt: new Date().toISOString(),
        },
        RefArr: {
          name: "FatakPayDCL",
          createdAt: new Date().toISOString(),
        },
      },
    };

    await UserDB.updateOne({ phone: user.phone }, updateDoc);
    console.log(`✅ DB updated for: ${user.phone}`);
  });

  await Promise.allSettled(promises);
}

// ----------------- Delay -----------------
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ----------------- Main Loop -----------------
async function Loop() {
  const initialToken = await createUserToken();
  if (!initialToken) {
    console.log("❌ Token missing. Aborting...");
    return;
  }

  // Object to hold dynamic token
  const tokenRef = { token: initialToken };

  async function processNextBatch() {
    try {
      console.log("\n🔎 Looking for new leads...");

      const leads = await UserDB.aggregate([
        { $match: { "RefArr.name": { $ne: "FatakPayDCL" } } },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("⏸️ No unprocessed leads. Retrying in 2 seconds...");
        await delay(2000);
        return processNextBatch();
      }

      await processBatch(leads, tokenRef);
      console.log(`✅ Processed batch of ${leads.length} users`);

      console.log("⏳ Waiting 2 seconds before next batch...");
      await delay(5000);

      await processNextBatch();
    } catch (err) {
      console.error("❌ Error in processing:", err.message);
    }
  }

  processNextBatch();
}

Loop();
