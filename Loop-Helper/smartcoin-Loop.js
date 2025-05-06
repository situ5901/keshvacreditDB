const mongoose = require("mongoose");
const axios = require("axios");
const qs = require("qs");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const SmartcoinModel = mongoose.model(
  "smartcoin",
  new mongoose.Schema({}, { collection: "smartcoin", strict: false }),
);

const BATCH_SIZE = 5;
const Partner_id = "Keshvacredit";
const PRE_APPROVAL_API =
  "https://leads.smartcoin.co.in/partner/keshvacredit/lead/create";

function getHeaders() {
  return {
    "Content-Type": "application/x-www-form-urlencoded",
    "admin-api-client-id": "SC_KVCD_oruwm5w5fXy4JNoi",
    "admin-api-client-key": "esy7kphMG6G9hu90",
  };
}

function isValidPAN(pan) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
}

function formatDOB(dob) {
  if (!dob) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;
  if (/^\d{2}-\d{2}-\d{4}$/.test(dob)) {
    const [dd, mm, yyyy] = dob.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  try {
    const date = new Date(dob);
    return date.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

async function getPreApproval(lead) {
  try {
    const payload = {
      phone_number: String(lead.phone),
      pan: lead.pan,
      employment_type: lead.employment,
      net_monthly_income: lead.income || 0,
      name_as_per_pan: lead.name,
      date_of_birth: formatDOB(lead.dob),
      Partner_id: Partner_id,
    };

    const response = await axios.post(PRE_APPROVAL_API, qs.stringify(payload), {
      headers: getHeaders(),
    });

    return response.data;
  } catch (err) {
    return {
      status: "FAILED",
      message: err.response?.data?.message || err.message || "Unknown Error",
      pan: lead.pan,
    };
  }
}

let successCount = 0;

async function processBatch(leads) {
  const promises = leads.map(async (lead) => {
    try {
      if (!lead.phone || !lead.name || !lead.dob || !lead.pan) {
        await SmartcoinModel.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedSmartcoin",
                reason: "Incomplete data",
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      if (!isValidPAN(lead.pan)) {
        await SmartcoinModel.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedSmartcoin",
                reason: `Invalid PAN: ${lead.pan}`,
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      const userDoc = await SmartcoinModel.findOne({ phone: lead.phone });

      if (!userDoc) {
        console.log(`⚠️ No document found for phone: ${lead.phone}`);
        return;
      }

      if (userDoc?.RefArr?.some((ref) => ref.name === "Smartcoin")) {
        console.log(`⛔ Already processed: ${lead.phone}`);
        return;
      }

      const preApprovalResponse = await getPreApproval(lead);

      if (
        preApprovalResponse.status === "success" &&
        preApprovalResponse.message === "Lead created successfully"
      ) {
        successCount++;

        await SmartcoinModel.updateOne(
          { phone: lead.phone },
          {
            $push: {
              apiResponse: {
                smartcoin: preApprovalResponse,
                status: preApprovalResponse.status,
                message: preApprovalResponse.message,
                createdAt: new Date().toISOString(),
              },
              RefArr: {
                name: "Smartcoin",
                createdAt: new Date().toISOString(),
              },
            },
            $unset: { accounts: "" },
          },
        );

        console.log(`✅ Lead processed: ${lead.phone}`);
      } else {
        console.log(`⛔ Failed: ${preApprovalResponse.message}`);
        await SmartcoinModel.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedSmartcoin",
                reason: preApprovalResponse.message,
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
      }
    } catch (err) {
      console.error("❌ Error processing lead:", err.message);
    }
  });

  await Promise.allSettled(promises);
}

let totalLeads = 0;

async function Loop() {
  try {
    while (true) {
      const leads = await SmartcoinModel.aggregate([
        {
          $match: {
            "RefArr.name": { $nin: ["Smartcoin", "SkippedSmartcoin"] },
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("✅ All leads processed.");
        break;
      }

      await processBatch(leads);
      totalLeads += leads.length;

      console.log(`🏁 Successful Leads: ${successCount}`);
      console.log(`📊 Processed So Far: ${totalLeads}`);
    }
  } catch (error) {
    console.error("❌ Loop error:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

Loop();
