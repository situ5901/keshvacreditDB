const mongoose = require("mongoose");
const axios = require("axios");
const qs = require("qs");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;
const BATCH_SIZE = 50;
const CONCURRENCY_LIMIT = 3;
const DELAY_BETWEEN_BATCH_MS = 2000;

const Partner_id = "Keshvacredit";
const PRE_APPROVAL_API =
  "https://leads.smartcoin.co.in/partner/keshvacredit/lead/create";

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

function getheaders() {
  return {
    "content-type": "application/x-www-form-urlencoded",
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
      headers: getheaders(),
    });

    return response.data;
  } catch (err) {
    return {
      status: "FAILED",
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

let successCount = 0;
let totalLeads = 0;

async function processLead(lead) {
  if (!lead.phone || !lead.name || !lead.dob || !lead.pan) {
    await UserDB.updateOne(
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
    await UserDB.updateOne(
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

  const userDoc = await UserDB.findOne({ phone: lead.phone });
  if (userDoc?.RefArr?.some((ref) => ref.name === "Smartcoin")) return;

  // Clean structure
  const updates = {};
  if (userDoc.apiResponse && !Array.isArray(userDoc.apiResponse))
    updates.apiResponse = [userDoc.apiResponse];
  if (userDoc.preApproval && !Array.isArray(userDoc.preApproval))
    updates.preApproval = [userDoc.preApproval];
  if (Object.keys(updates).length > 0)
    await UserDB.updateOne({ phone: lead.phone }, { $set: updates });

  const res = await getPreApproval(lead);

  const updateDoc = {
    $push: {
      apiResponse: {
        smartcoin: res,
        status: res.status,
        message: res.message,
        createdAt: new Date().toISOString(),
      },
      RefArr: {
        name: "Smartcoin",
        createdAt: new Date().toISOString(),
      },
    },
    $unset: { accounts: "" },
  };

  await UserDB.updateOne({ phone: lead.phone }, updateDoc);

  if (res.status === "success" && res.message === "Lead created successfully") {
    successCount++;
    console.log(`✅ Lead Success: ${lead.phone}`);
  } else {
    console.log(`⛔ Lead Failed: ${lead.phone} | Reason: ${res.message}`);
  }
}

async function processBatch(leads) {
  const queue = [...leads];
  const workers = [];

  while (queue.length > 0) {
    const chunk = queue.splice(0, CONCURRENCY_LIMIT);
    const promises = chunk.map(processLead);
    await Promise.allSettled(promises);
  }
}

async function Loop() {
  try {
    while (true) {
      const leads = await UserDB.aggregate([
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

      totalLeads += leads.length;
      console.log(`🚀 Processing ${leads.length} leads...`);
      await processBatch(leads);

      console.log(`📊 Total Leads Processed: ${totalLeads}`);
      console.log(`🎯 Total Success: ${successCount}`);
      await new Promise((res) => setTimeout(res, DELAY_BETWEEN_BATCH_MS));
    }
  } catch (err) {
    console.error("❌ Loop Error:", err.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    console.log(`📊 Total Leads Processed: ${totalLeads}`);
    console.log(`🎯 Total Success: ${successCount}`);
    mongoose.connection.close();
  }
}

Loop();
