const mongoose = require("mongoose");
const axios = require("axios");
const qs = require("qs");
const path = require("path");
const xlsx = require("xlsx");
require("dotenv").config();

const PINCODE_FILE_PATH = path.join(__dirname, "..", "xlsx", "mv.xlsx");
const MONGODB_URINEW = process.env.MONGODB_VISHU;

const UserDB = mongoose.model(
  "zype",
  new mongoose.Schema({}, { collection: "zype", strict: false }),
);

let validPincodes = new Set();
const BATCH_SIZE = 3000;
const Partner_id = "Keshvacredit";
const PRE_APPROVAL_API =
  "https://leads.smartcoin.co.in/partner/keshvacredit/lead/create";

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

    console.log("📤 Sending PreApproval Payload:", payload);

    const response = await axios.post(PRE_APPROVAL_API, qs.stringify(payload), {
      headers: getheaders(),
    });

    console.log("✅ PreApproval API Response:", response.data);

    if (response.data.status === "success") {
      console.log(
        "🎉 Lead created successfully with Lead ID:",
        response.data.leadId,
      );
      return response.data;
    } else {
      console.error("❌ Failed to create lead:", response.data.message);
      return {
        status: "FAILED",
        message: response.data.message || "Unknown error",
        pan: lead.pan,
      };
    }
  } catch (err) {
    console.error(
      "❌ PreApproval API Error:",
      err.response?.data || err.message,
    );
    return {
      status: "FAILED",
      message: err.response?.data?.message || err.message || "Unknown Error",
      pan: lead.pan,
    };
  }
}

async function loadValidPincodes() {
  try {
    console.log(`🔎 Loading pincodes from: ${PINCODE_FILE_PATH}`);
    const workbook = xlsx.readFile(PINCODE_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      range: 0,
    });

    for (const row of data) {
      const pincode = String(row[0]).trim();
      if (pincode && !isNaN(pincode)) {
        validPincodes.add(pincode);
      }
    }
    console.log(`✅ Loaded ${validPincodes.size} valid pincodes.`);
  } catch (error) {
    console.error("❌ Error loading pincodes:", error.message);
    throw new Error("Failed to load valid pincodes, stopping script.");
  }
}

let successCount = 0;

async function processBatch(leads) {
  const promises = leads.map(async (lead) => {
    try {
      const leadPincode = String(lead.pincode || "").trim();

      if (!leadPincode || !validPincodes.has(leadPincode)) {
        console.error(
          `❌ Pincode check failed for lead: ${lead.phone}. Pincode: ${leadPincode}. Skipping API call.`,
        );
        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedSmartcoin",
                reason: `Pincode ${leadPincode} not in allowed list from Excel.`,
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      lead.pan = lead.pan || lead.pan;

      if (!lead.phone || !lead.name || !lead.dob || !lead.pan) {
        console.error(`❌ Incomplete data for lead: ${lead.phone}. Skipping.`);
        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedSmartcoin",
                reason: "Incomplete data (missing phone/Name/DOB/PAN)",
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      if (!isValidPAN(lead.pan)) {
        console.error(
          `❌ Invalid PAN format for lead: ${lead.phone} with PAN: ${lead.pan}`,
        );
        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedSmartcoin",
                reason: `Invalid PAN format: ${lead.pan}`,
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      const userDoc = await UserDB.findOne({ phone: lead.phone });
      if (userDoc?.RefArr?.some((ref) => ref.name === "Smartcoin")) {
        console.log(`⛔ Lead already processed for SmartCoin: ${lead.phone}`);
        return;
      }

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

      const preApprovalResponse = await getPreApproval(lead);
      console.log("✅ PreApproval Response:", preApprovalResponse);

      const updateDoc = {
        $push: {
          apiResponse: {
            name: "SmartCoin",
            status: preApprovalResponse.status,
            message: preApprovalResponse.message,
            leadId: preApprovalResponse.leadId,
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: "Smartcoin",
            createdAt: new Date().toISOString(),
          },
        },
        $unset: { accounts: "" },
      };

      const result = await UserDB.updateOne({ phone: lead.phone }, updateDoc);
      console.log("🧾 Saved API response to DB:", result);

      if (
        preApprovalResponse.status === "success" &&
        preApprovalResponse.message === "Lead created successfully"
      ) {
        successCount++;
        console.log("✅ Lead counted as success:", lead.phone);
      } else {
        console.log(`⛔ API failed: ${preApprovalResponse.message}`);
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
    await loadValidPincodes();
    while (true) {
      console.log("📦 Fetching new leads...");
      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $nin: ["Smartcoin", "SkippedSmartcoin"] },
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("✅ All leads processed. No more data.");
        break;
      }

      await processBatch(leads);
      totalLeads += leads.length;

      console.log(`🏁 Total Successful SmartCoin Leads: ${successCount}`);
      console.log(`📊 Total Leads Processed So Far: ${totalLeads}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("❌ Loop error:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    console.log(`🏁 Total Successful SmartCoin Leads: ${successCount}`);
    mongoose.connection.close();
  }
}

mongoose
  .connect(MONGODB_URINEW)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    Loop();
  })
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));
