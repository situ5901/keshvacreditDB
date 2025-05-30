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
      purpose_of_loan: "3",
      loan_amount: loanAmount,
      Partner_id: Partner_id,
      customer_lead_id: lead._id || "",
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
  let successCount = 0;

  const results = await Promise.allSettled(
    users.map(async (user) => {
      if (user.RefArr && user.RefArr.some((r) => r.name === "Rupee112")) {
        console.log(`⏭️ Skipping user ${user.phone} as already processed.`);
        return;
      }

      const userDoc = await UserDB.findOne({ phone: user.phone });
      if (!userDoc) {
        console.log(`❌ User with phone ${user.phone} not found in DB.`);
        return;
      }

      const response = await sendToDedupeAPI(user);

      let updateDoc = {
        $unset: { accounts: "" },
        $push: {
          apiResponse: {
            Rupee112: {},
            status: "",
            message: "",
            createdAt: new Date().toISOString(),
          },
        },
        $addToSet: {
          RefArr: { name: "Rupee112" },
        },
      };

      if (response.Status === "2" || response.Message === "User not found") {
        const pushResponse = await sendToPunshAPI(user);

        updateDoc.$push.apiResponse.Rupee112 = { ...pushResponse };
        updateDoc.$push.apiResponse.status =
          pushResponse.status || pushResponse.Status;
        updateDoc.$push.apiResponse.message =
          pushResponse.message || pushResponse.Error;

        // ✅ Count only if push is successful
        if (
          pushResponse.Status === 1 &&
          pushResponse.Message === "Lead Created Successfuly"
        ) {
          successCount += 1;
        }
      } else {
        updateDoc.$push.apiResponse.Rupee112 = { ...response };
        updateDoc.$push.apiResponse.status = response.status || response.Status;
        updateDoc.$push.apiResponse.message =
          response.message || response.Error;
      }

      await UserDB.updateOne({ phone: user.phone }, updateDoc);
    }),
  );

  return successCount;
}

async function Loop() {
  let processedCount = 0;
  let successLeads = 0;

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

      const batchSuccess = await processBatch(leads);
      processedCount += leads.length;
      successLeads += batchSuccess;

      console.log(`✅ Processed batch of: ${leads.length}`);
      console.log(
        `🎯 Successfully Created Leads in This Batch: ${batchSuccess}`,
      );
      console.log(`🏁 Total Processed Leads: ${processedCount}`);
      console.log(`🌟 Total Successfully Created Leads: ${successLeads}`);

      await new Promise((resolve) => setImmediate(resolve)); // super-fast no delay
    }
  } catch (error) {
    console.error("❌ Error in loop:", error);
  }
}

Loop();
