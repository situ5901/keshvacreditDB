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

    // Log the full response data from the Eligibility API
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

    // Log the full response data from the PreApproval API
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
  for (let lead of leads) {
    // Process the lead without printing the MongoDB document
    const eligibilityResponse = await sendToNewAPI(lead);
    console.log("✅ Eligibility Response:", eligibilityResponse); // Log Eligibility Response

    if (
      eligibilityResponse.message ===
      "no duplicate found and partner can proceed with the lead"
    ) {
      if (eligibilityResponse.status === "success") {
        const preApprovalResponse = await getPreApproval(lead);
        console.log("✅ PreApproval Response:", preApprovalResponse); // Log PreApproval Response
      } else {
        console.log(
          `⛔ No PreApproval for: ${lead.phone} — Status: ${eligibilityResponse.status}`,
        );
      }
    }
  }
}

async function Loop() {
  try {
    while (true) {
      console.log("📦 Fetching new leads...");
      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $ne: "SmartCoin" },
          },
        },
        { $limit: BATCH_SIZE },
        { $sort: { _id: 1 } },
      ]);

      if (leads.length === 0) {
        console.log("✅ All leads processed. No more new data.");
        break;
      }

      await processBatch(leads); // Process the leads without logging MongoDB doc
    }
  } catch (error) {
    console.error("❌ Error occurred in loop:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

Loop();
