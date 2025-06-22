const mongoose = require("mongoose");
const axios = require("axios");
const readXlsxFile = require("read-excel-file/node");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

// Mongo URI
const MONGODB_URINEW = process.env.MONGODB_URINEW;
if (!MONGODB_URINEW) {
  console.error("❌ MONGODB_URINEW is not defined in .env file.");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Model
const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false })
);

// Constants
const MAX_PROCESS = 10000;
const BATCH_SIZE = 100;
const Partner_id = "Keshvacredit";
const DEDUPE_API_URL = "https://api.rupee112fintech.com/marketing-check-dedupe/";
const PushAPI_URL = "https://api.rupee112fintech.com/marketing-push-data";
const loanAmount = "20000";

// Generate 7-digit ID
const generate7DigitId = () => {
  const digits = uuidv4().replace(/\D/g, "");
  return digits.slice(0, 7);
};

// Header
function getHeaders() {
  return {
    Username: "KESHVACREDIT_20250421",
    Auth: "a154c75adc5c96003c740668545c8ed59ff99f5ee520e8feb4b8087a41b2eb2a",
    "Content-Type": "application/json"
  };
}

// User validation
function isValidUser(user) {
  const empType = (user.employmentType || "").toLowerCase().trim();
  if (empType !== "salaried") return { valid: false, reason: `Invalid employment type: ${user.employmentType}` };
  const age = Number(user.age);
  if (isNaN(age) || age < 25 || age > 50) return { valid: false, reason: `Invalid age: ${user.age}` };
  return { valid: true };
}

// API: Dedupe
async function sendToDedupeAPI(lead) {
  try {
    const payload = {
      mobile: lead.phone,
      pancard: lead.pan,
      Partner_id
    };
    console.log(`🔍 Sending Dedupe for ${lead.phone}`);
    const res = await axios.post(DEDUPE_API_URL, payload, { headers: getHeaders() });
    return res.data;
  } catch (err) {
    return {
      Status: 0,
      Error: err.response?.data?.Error || err.message || "Unknown Dedupe Error"
    };
  }
}

// API: Push
async function sendToPushAPI(lead) {
  try {
    const body = {
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
      customer_lead_id: generate7DigitId()
    };
    console.log(`📤 Pushing to Marketing API for ${lead.phone}`);
    const res = await axios.post(PushAPI_URL, body, { headers: getHeaders() });
    return res.data;
  } catch (err) {
    return {
      Status: 0,
      Error: err.response?.data?.message || err.message || "Unknown Push API Error"
    };
  }
}

// Batch processor
async function processBatch(users, validPincodes) {
  let successCount = 0;

  await Promise.allSettled(users.map(async (user) => {
    try {
      if (user.RefArr && user.RefArr.some(r => r.name === "Rupee112")) return;

      const pincode = String(user.pincode || "").trim();
      if (!pincode || !validPincodes.includes(pincode)) {
        await UserDB.updateOne({ phone: user.phone }, {
          $push: {
            RefArr: {
              name: "SkippedRupee112",
              reason: `Invalid or missing pincode: ${user.pincode}`,
              createdAt: new Date().toISOString()
            }
          }
        });
        return;
      }

      const { valid, reason } = isValidUser(user);
      if (!valid) {
        await UserDB.updateOne({ phone: user.phone }, {
          $push: {
            RefArr: {
              name: "SkippedRupee112",
              reason,
              createdAt: new Date().toISOString()
            }
          }
        });
        return;
      }

      const dedupeRes = await sendToDedupeAPI(user);
      const updateDoc = {
        $unset: { accounts: "" },
        $push: {
          apiResponse: {
            Rupee112: {},
            status: "",
            message: "",
            createdAt: new Date().toISOString()
          }
        },
        $addToSet: { RefArr: { name: "Rupee112" } }
      };

      if (dedupeRes.Status === "2" || dedupeRes.Message === "User not found") {
        const pushRes = await sendToPushAPI(user);
        updateDoc.$push.apiResponse.Rupee112 = { ...pushRes };
        updateDoc.$push.apiResponse.status = pushRes.status || pushRes.Status;
        updateDoc.$push.apiResponse.message = pushRes.message || pushRes.Error;

        if (pushRes.Status === 1 && pushRes.Message === "Lead Created Successfuly") {
          successCount++;
        }
      } else {
        updateDoc.$push.apiResponse.Rupee112 = { ...dedupeRes };
        updateDoc.$push.apiResponse.status = dedupeRes.status || dedupeRes.Status;
        updateDoc.$push.apiResponse.message = dedupeRes.message || dedupeRes.Error;
      }

      await UserDB.updateOne({ phone: user.phone }, updateDoc);
    } catch (err) {
      await UserDB.updateOne({ phone: user.phone }, {
        $push: {
          RefArr: {
            name: "SkippedRupee112Error",
            reason: `Unexpected error: ${err.message}`,
            createdAt: new Date().toISOString()
          }
        }
      });
    }
  }));

  return successCount;
}

// Loop
async function Loop(validPincodes) {
  let successLeads = 0;

  try {
    while (successLeads < MAX_PROCESS) {
      const leads = await UserDB.aggregate([
        { $match: { "RefArr.name": { $ne: "Rupee112" } } },
        { $limit: BATCH_SIZE * 2 }
      ]);

      if (!leads.length) break;

      const validLeads = leads.filter(user => {
        const { valid } = isValidUser(user);
        const pin = String(user.pincode || "").trim();
        return valid && pin && validPincodes.includes(pin);
      });

      if (!validLeads.length) {
        if (leads.length < BATCH_SIZE * 2) break;
        await new Promise(resolve => setImmediate(resolve));
        continue;
      }

      const remaining = MAX_PROCESS - successLeads;
      const toProcess = validLeads.slice(0, Math.min(validLeads.length, remaining));

      const batchSuccess = await processBatch(toProcess, validPincodes);
      successLeads += batchSuccess;

      if (successLeads >= MAX_PROCESS) break;
      await new Promise(resolve => setImmediate(resolve));
    }
  } catch (err) {
    console.error("❌ Unhandled error in Loop:", err);
  } finally {
    console.log("✅ Job Complete. Disconnecting MongoDB...");
    mongoose.disconnect();
  }
}

// Load Pincode Excel and Start Loop
readXlsxFile(fs.createReadStream("xlsx/rupee.xlsx")).then((rows) => {
  const header = rows[0];
  const pinIndex = header.indexOf("Pincode");

  if (pinIndex === -1) {
    console.error("❌ 'Pincode' column not found in Excel.");
    process.exit(1);
  }

  const validPincodes = rows.slice(1).map(r => String(r[pinIndex]).trim());
  console.log(`📌 Loaded ${validPincodes.length} pincodes.`);
  Loop(validPincodes);
});
