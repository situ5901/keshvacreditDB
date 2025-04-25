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
  "loops",
  new mongoose.Schema({}, { collection: "loops", strict: false }),
);

const BATCH_SIZE = 10;
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
      phone_number: String(lead.Phone),
      pan: lead.PanCard,
      employment_type: "Salaried",
      net_monthly_income: "25000",
      name_as_per_pan: lead.Name,
      date_of_birth: lead.DOB,
      Partner_id: Partner_id,
    };

    console.log("📤 Sending Eligibility Payload:", payload);

    const response = await axios.post(ELIGIBILITY_API, qs.stringify(payload), {
      headers: getHeaders(),
    });

    console.log("✅ Eligibility API Response:", response.data);

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
      phone_number: lead.Phone,
      pan: lead.PanCard,
      employment_type: "Salaried",
      net_monthly_income: "25000",
      name_as_per_pan: lead.Name,
      date_of_birth: lead.DOB,
      Partner_id: Partner_id,
    };

    console.log("📤 Sending PreApproval Payload:", payload);

    const response = await axios.post(PRE_APPROVAL_API, qs.stringify(payload), {
      headers: getHeaders(),
    });

    console.log("✅ PreApproval API Response:", response.data);

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

async function processBatch(leads) {
  const promises = leads.map(async (lead) => {
    try {
      const userDoc = await UserDB.findOne({ phone: lead.Phone });

      const updates = {};
      let needUpdate = false;

      // Handle apiResponse field for the UserDB
      if (userDoc.apiResponse && !Array.isArray(userDoc.apiResponse)) {
        updates.apiResponse = [userDoc.apiResponse];
        needUpdate = true;
      }

      // Handle preApproval field for the UserDB
      if (userDoc.preApproval && !Array.isArray(userDoc.preApproval)) {
        updates.preApproval = [userDoc.preApproval];
        needUpdate = true;
      }

      if (needUpdate) {
        await UserDB.updateOne({ phone: lead.Phone }, { $set: updates });
      }

      // Eligibility API request
      const eligibilityResponse = await sendToNewAPI(lead);
      console.log("✅ Eligibility Response:", eligibilityResponse); // Log Eligibility Response

      const updateDoc = {
        $push: {
          apiResponse: {
            fullResponse: {
              ...eligibilityResponse,
              smartcoin: true,
            },
            status: eligibilityResponse.status,
            amount: eligibilityResponse.amount,
            message: eligibilityResponse.message,
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: "smartcoin",
            createdAt: new Date().toISOString(),
          },
        },
        $unset: { accounts: "" },
      };

      if (eligibilityResponse.status === "ACCEPT") {
        const preApprovalResponse = await getPreApproval(lead);
        console.log("✅ PreApproval Response:", preApprovalResponse); // Log PreApproval Response

        updateDoc.$push.apiResponse = {
          smartcoinRespo: preApprovalResponse,
          status: preApprovalResponse.status,
          message: preApprovalResponse.message,
          createdAt: new Date().toISOString(),
        };
      } else {
        console.log(
          `⛔ No PreApproval — Status: ${eligibilityResponse.status}`,
        );
      }

      await UserDB.updateOne({ phone: lead.Phone }, updateDoc);
    } catch (err) {
      console.error("❌ Error processing lead:", err.message);
    }
  });

  await Promise.all(promises);
}

async function Loop() {
  try {
    while (true) {
      console.log("📦 Fetching new leads...");
      const leads = await UserDB.aggregate([
        { $match: { "RefArr.name": { $ne: "SmartCoin" } } },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("✅ All leads processed. No more new data.");
        break;
      }

      await processBatch(leads); // Process the leads without delay
    }
  } catch (error) {
    console.error("❌ Error occurred in loop:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

Loop();
