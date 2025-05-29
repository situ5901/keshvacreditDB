const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "loops",
  new mongoose.Schema({}, { collection: "loops", strict: false }),
);

const BATCH_SIZE = 1;
const Partner_id = "Keshvacredit";
const DEDUPE_API_URL =
  "https://api.rupee112fintech.com/marketing-check-dedupe/";
const PushAPI_URL = "https://api.rupee112fintech.com/marketing-push-data";

const loanAmount = "20000"; // string

function getHeaders() {
  return {
    Username: "KESHVACREDIT_20250421",
    Auth: "a154c75adc5c96003c740668545c8ed59ff99f5ee520e8feb4b8087a41b2eb2a",
    "Content-Type": "application/json",
  };
}

async function sendToDedupeAPI(lead) {
  try {
    const FirstPayload = {
      mobile: lead.phone,
      pancard: lead.pan,
      Partner_id: Partner_id,
    };
    console.log("📤 Sending Lead Data to Dedupe API:", FirstPayload);

    const response = await axios.post(DEDUPE_API_URL, FirstPayload, {
      headers: getHeaders(),
    });

    console.log("✅ Dedupe API Response Received:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "🚫 Dedupe API Call Failed for",
      lead.phone,
      ":",
      error.message,
    );
    return { Status: 0, Error: error.response?.data?.Error || error.message };
  }
}

async function sendToPunshAPI(lead) {
  try {
    const apiRequestBody = {
      full_name: lead.name || "",
      mobile: lead.phone || "",
      email: lead.email || "",
      pancard: lead.pan || "",
      pincode: lead.pincode || "",
      income_type: "1",
      monthly_salary: lead.income || "",
      purpose_of_loan: "Other",
      loan_amount: loanAmount,
      Partner_id: Partner_id,
    };

    console.log("📤 Sending Lead Data to Marketing Push API:", apiRequestBody);

    const response = await axios.post(PushAPI_URL, apiRequestBody, {
      headers: getHeaders(),
    });

    console.log("✅ Marketing Push API Response Received:", response.data);
    return response.data;
  } catch (err) {
    console.error(
      "❌ PreApproval API Error:",
      err.response?.data || err.message,
    );
    return {
      Status: 0,
      Error: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

async function processBatch(users) {
  const results = await Promise.allSettled(
    users.map(async (user) => {
      const userDoc = await UserDB.findOne({ phone: user.phone });
      if (!userDoc) {
        console.log(`User with phone ${user.phone} not found in DB.`);
        return; // Ya koi error handle kar
      }
      const response = await sendToDedupeAPI(user);

      let updateDoc = {
        $unset: { accounts: "" },
      };

      if (response.Status === "2" || response.Message === "User not found") {
        // Agar user not found hai, toh second API ko hit karo
        const pushResponse = await sendToPunshAPI(user);

        // Sirf second API ka response save karo
        updateDoc.$push = {
          apiResponse: {
            Rupee112Response: {
              ...pushResponse,
              Rupee112: true,
            },
            status: pushResponse.status || pushResponse.Status,
            message: pushResponse.message || pushResponse.Error,
            createdAt: new Date().toISOString(),
          },
        };
      } else {
        // Warna sirf first API ka response save karo
        updateDoc.$push = {
          apiResponse: {
            Rupee112Response: {
              ...response,
              Rupee112: true,
            },
            status: response.status || response.Status,
            message: response.message || response.Error,
            createdAt: new Date().toISOString(),
          },
        };
      }

      await UserDB.updateOne({ phone: user.phone }, updateDoc);
    }),
  );

  return results;
}

async function Loop() {
  try {
    while (true) {
      console.log("📦 Fetching leads...");
      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $ne: "Rupee112" },
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (!leads.length) {
        console.log("🎉 All leads processed. Exiting loop.");
        break;
      }

      await processBatch(leads);

      await new Promise((resolve) => setTimeout(resolve, 2000)); // small delay between batches
    }
  } catch (error) {
    console.error("❌ Error in loop:", error);
  }
}

Loop();
