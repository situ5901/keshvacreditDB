const mongoose = require("mongoose");
const axios = require("axios");
const qs = require("qs");
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

const BATCH_SIZE = 10;
const MAX_LEADS = 10000;
const Partner_id = "Keshvacredit";

const ELIGIBILITY_API =
  "https://leads.smartcoin.co.in/partner/keshvacredit/lead/dedup";
const PRE_APPROVAL_API =
  "https://leads.smartcoin.co.in/partner/keshvacredit/lead/create";

function getHeaders() {
  return {
    "Content-Type": "application/x-www-form-urlencoded",
    "admin-api-client-id": "SC_KVCD_oruwm5w5fXy4JNoi",
    "admin-api-client-key": "esy7kphMG6G9hu90",
  };
}

async function sendToNewAPI(lead) {
  try {
    const payload = {
      phone_number: lead.phone,
      pan: lead.pan,
      employment_type: lead.employment,
      net_monthly_income: lead.income,
      name_as_per_pan: lead.name,
      date_of_birth: lead.dob,
      Partner_id: Partner_id,
    };

    console.log("📤 Sending Eligibility Payload:", payload);

    const response = await axios.post(ELIGIBILITY_API, qs.stringify(payload), {
      headers: getHeaders(),
    });

    console.log("✅ Eligibility Response:", response.data);
    return response.data;
  } catch (err) {
    console.error(
      "❌ Eligibility API Error:",
      err.response?.data || err.message,
    );
    return {
      status: "FAILED",
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

async function getPreApproval(lead) {
  try {
    const payload = {
      phone_number: lead.phone,
      pan: lead.pan,
      employment_type: lead.employment,
      net_monthly_income: lead.income,
      name_as_per_pan: lead.name,
      date_of_birth: lead.dob,
      Partner_id: Partner_id,
    };

    console.log("📤 Sending PreApproval Payload:", payload);

    const response = await axios.post(PRE_APPROVAL_API, qs.stringify(payload), {
      headers: getHeaders(),
    });

    console.log("✅ PreApproval Response:", response.data);
    return response.data;
  } catch (err) {
    console.error(
      "❌ PreApproval API Error:",
      err.response?.data || err.message,
    );
    return {
      status: "FAILED",
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

async function processBatch(leads, successCounter) {
  for (let lead of leads) {
    const userDoc = await UserDB.findOne({ phone: lead.phone });

    const updates = {};
    let needUpdate = false;

    if (userDoc.apiResponse && !Array.isArray(userDoc.apiResponse)) {
      updates.apiResponse = [userDoc.apiResponse];
      needUpdate = true;
    }

    if (userDoc.preApproval && !Array.isArray(userDoc.preApproval)) {
      updates.preApproval = [userDoc.preApproval];
      needUpdate = true;
    }

    if (needUpdate) {
      await UserDB.updateOne({ phone: lead.phone }, { $set: updates });
    }

    const response = await sendToNewAPI(lead);

    // 👉 increment if message matches exactly
    if (
      response.message ===
      "no duplicate found and partner can proceed with the lead"
    ) {
      successCounter.count++;
    }

    const updateDoc = {
      $push: {
        apiResponse: {
          SmartCoinResponse: {
            SmartCoin: true,
            ...response,
          },
          status: response.status,
          message: response.message,
          createdAt: new Date().toISOString(),
        },
        RefArr: {
          name: "SmartCoin",
          createdAt: new Date().toISOString(),
        },
      },
      $unset: { accounts: "" },
    };

    if (response.status === "success") {
      const preApproval = await getPreApproval(lead);

      updateDoc.$push.apiResponse = {
        SmartCoinResponse: preApproval,
        status: preApproval.status,
        message: preApproval.message,
        createdAt: new Date().toISOString(),
      };

      console.log(`✅ PreApproval done for: ${lead.phone}`);
    } else {
      console.log(
        `⛔ No PreApproval for: ${lead.phone} — Status: ${response.status}`,
      );
    }

    await UserDB.updateOne({ phone: lead.phone }, updateDoc);
  }
}

async function Loop() {
  let processedCount = 0;
  let hasMoreLeads = true;

  const successCounter = { count: 0 }; // 👈 counter object

  try {
    while (hasMoreLeads && processedCount < MAX_LEADS) {
      console.log("📦 Fetching leads...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            processed: { $ne: true },
            "RefArr.name": { $ne: "SmartCoin" },
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        hasMoreLeads = false;
        console.log("✅ All leads processed.");
      } else {
        await processBatch(leads, successCounter);
        processedCount += leads.length;

        console.log(`✅ Total Processed: ${processedCount}`);

        if (processedCount >= MAX_LEADS) {
          console.log("✅ MAX limit reached.");
          hasMoreLeads = false;
        } else {
          console.log("⏳ Waiting 2 seconds before next batch...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }
  } catch (error) {
    console.error("❌ Error occurred:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
    console.log(
      `📊 Total 'no duplicate found and partner can proceed with the lead' count: ${successCounter.count}`,
    );
  }
}

Loop();
