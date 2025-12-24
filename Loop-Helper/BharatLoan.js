const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
//update
const MONGODB_URINEW = process.env.MONGODB_URINEW;
const BATCH_SIZE = 10;
const Partner_id = "Keshvacredit";
const DEDUPE_API_URL =
  "https://api.bharatloanfintech.com/marketing-check-dedupe/";
const PushAPI_URL = "https://api.bharatloanfintech.com/marketing-push-data";
const loanAmount = "20000";

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

function getHeaders() {
  return {
    Username: "KESHVACREDIT_20250421",
    Auth: "a154c75adc5c96003c740668545c8ed59ff99f5ee520e8feb4b8087a41b2eb2a",
    "Content-Type": "application/json",
  };
}

const generate7DigitId = () => uuidv4().replace(/\D/g, "").slice(0, 7);

async function sendToDedupeAPI(lead) {
  try {
    const FirstPayload = {
      mobile: lead.phone,
      pancard: lead.pan,
      Partner_id,
    };
    console.log("📤 Sending to Dedupe API:", FirstPayload);
    const response = await axios.post(DEDUPE_API_URL, FirstPayload, {
      headers: getHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error("🚫 Dedupe API error for", lead.phone, ":", error.message);
    return { Status: 0, Error: error.response?.data?.Error || error.message };
  }
}

async function sendToPushAPI(lead) {
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
      Partner_id,
      customer_lead_id: generate7DigitId(),
    };

    console.log("📤 Sending to Push API:", apiRequestBody);
    const response = await axios.post(PushAPI_URL, apiRequestBody, {
      headers: getHeaders(),
    });
    return response.data;
  } catch (err) {
    console.error("❌ Push API Error:", err.response?.data || err.message);
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
      if (user.RefArr?.some((r) => r.name === "BharatLoan")) {
        console.log(`⏭️ Skipping ${user.phone} (already processed)`);
        return;
      }

      const userDoc = await UserDB.findOne({ phone: user.phone });
      if (!userDoc) {
        console.log(`❌ No DB record for ${user.phone}`);
        return;
      }

      const response = await sendToDedupeAPI(user);

      const apiResponseEntry = {
        BharatLoan: {},
        status: "",
        message: "",
        createdAt: new Date().toISOString(),
      };

      if (response.Status === "2" || response.Message === "User not found") {
        const pushResponse = await sendToPushAPI(user);
        apiResponseEntry.BharatLoan = { ...pushResponse };
        apiResponseEntry.status = pushResponse.status || pushResponse.Status;
        apiResponseEntry.message = pushResponse.message || pushResponse.Error;

        if (
          pushResponse.Status === 1 &&
          pushResponse.Message === "Lead Created Successfuly"
        ) {
          successCount++;
        }
      } else {
        apiResponseEntry.BharatLoan = { ...response };
        apiResponseEntry.status = response.status || response.Status;
        apiResponseEntry.message = response.message || response.Error;
      }

      await UserDB.updateOne(
        { phone: user.phone },
        {
          $unset: { accounts: "" },
          $push: { apiResponse: { $each: [apiResponseEntry] } },
          $addToSet: { RefArr: { name: "BharatLoan" } },
        },
      );
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
        { $match: { "RefArr.name": { $ne: "BharatLoan" } } },
        { $limit: BATCH_SIZE },
      ]);

      if (!leads.length) {
        console.log("🎉 All leads processed. Exiting.");
        break;
      }

      const batchSuccess = await processBatch(leads);
      processedCount += leads.length;
      successLeads += batchSuccess;

      console.log(`✅ Batch Processed: ${leads.length}`);
      console.log(`🎯 Leads Created This Batch: ${batchSuccess}`);
      console.log(`🏁 Total Leads Processed: ${processedCount}`);
      console.log(`🌟 Total Successful Leads: ${successLeads}`);

      await new Promise((resolve) => setImmediate(resolve)); // yield to event loop
    }
  } catch (error) {
    console.error("❌ Loop Error:", error);
  }
}

Loop();
