const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();
const path = require("path");
const xlsx = require("xlsx");

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

const TOKEN_API = "https://atlas.whizdm.com/atlas/v1/token";
const DEDUPE_API = "https://atlas.whizdm.com/atlas/v1/lead/filter/pan";
const LEAD_API = "https://atlas.whizdm.com/atlas/v1/lead";
const PARTNER_CODE = 422;
const BATCH_SIZE = 1;
//situ
const PINCODE_FILE_PATH = path.join(__dirname, "..", "xlsx", "mv.xlsx");

function loadValidPincodes(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    const pins = data.map((row) => {
      let pin = row.pincode;
      if (typeof pin === "number") pin = pin.toString().padStart(6, "0");
      return String(pin).trim();
    });

    console.log(`✅ Loaded ${pins.length} valid pincodes from Excel`);
    return new Set(pins);
  } catch (error) {
    console.error("❌ Error loading valid pincodes:", error.message);
    return new Set();
  }
}

const validPincodesSet = loadValidPincodes(PINCODE_FILE_PATH);
if (validPincodesSet.size === 0) {
  console.warn("⚠️ No valid pincodes loaded. Skipping all leads.");
}

let successCount = 0;

async function getToken() {
  try {
    const tokenPayload = {
      userName: "keshvacredit",
      password: "Zb'91O(Nhy",
      partnerCode: PARTNER_CODE,
    };
    console.log(
      "\n🔐 [TOKEN REQUEST] =>",
      JSON.stringify(tokenPayload, null, 2),
    );
    const response = await axios.post(TOKEN_API, tokenPayload);
    console.log("✅ [TOKEN RESPONSE] =>", response.data.token, "\n");
    return response.data.token;
  } catch (error) {
    console.error(
      "❌ Error fetching token:",
      error.response?.data || error.message,
    );
    return null;
  }
}

async function dedupeCheck(pan, token) {
  try {
    console.log(`\n🧾 [DEDUPE REQUEST] PAN => ${pan}`);
    const response = await axios.get(`${DEDUPE_API}/${pan}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(
      "[DEDUPE RESPONSE] =>",
      JSON.stringify(response.data, null, 2),
      "\n",
    );
    return {
      status: response.data.status,
      message: response.data.message,
    };
  } catch (error) {
    console.error(
      `❌ Dedupe Error for PAN ${pan}:`,
      error.response?.data || error.message,
    );
    return { status: "failure" };
  }
}

async function sendToMoneyView(lead, token) {
  const requestBody = {
    partnerCode: PARTNER_CODE,
    partnerRef: "keshvacredit",
    phone: lead.phone,
    pan: lead.pan.trim(),
    name: lead.name.trim(),
    gender: lead.gender.toLowerCase(),
    dateofbirth: lead.dob,
    pincode: lead.pincode,
    employmenttype: lead.employment,
    declaredincome: lead.income,
  };

  console.log(
    "\n📤 [LEAD SUBMISSION REQUEST] =>",
    JSON.stringify(requestBody, null, 2),
  );

  try {
    const response = await axios.post(LEAD_API, requestBody, {
      headers: { "Content-Type": "application/json", token },
    });
    console.log(
      "📥 [LEAD SUBMISSION RESPONSE] =>",
      JSON.stringify(response.data, null, 2),
      "\n",
    );
    return { status: "success", data: response.data };
  } catch (error) {
    console.error(
      `❌ Submission failed for PAN: ${lead.pan}`,
      error.response?.data || error.message,
    );
    return {
      status: "failure",
      message: error.response?.data?.message || error.message,
    };
  }
}

function isValidPAN(pan) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
}

async function processBatch(leads, token) {
  const promises = leads.map(async (lead) => {
    try {
      lead.pan = lead.pan?.toUpperCase().trim();
      lead.pincode = String(lead.pincode).trim();

      if (
        !lead.phone ||
        !lead.name ||
        !lead.dob ||
        !lead.pan ||
        !lead.pincode
      ) {
        console.error(`❌ Incomplete data for ${lead.phone}. Skipping.`);
        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedMoneyView",
                reason: "Incomplete data",
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      if (!isValidPAN(lead.pan)) {
        console.error(`❌ Invalid PAN format: ${lead.pan}`);
        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedMoneyView",
                reason: `Invalid PAN: ${lead.pan}`,
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      if (!validPincodesSet.has(lead.pincode)) {
        console.error(
          `❌ Invalid Pincode: ${lead.pincode} for phone: ${lead.phone}`,
        );
        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedMoneyView",
                reason: `Invalid pincode: ${lead.pincode}`,
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      const userDoc = await UserDB.findOne({ phone: lead.phone });
      if (userDoc?.RefArr?.some((ref) => ref.name === "MoneyView")) {
        console.log(`⛔ Already processed: ${lead.phone}`);
        return;
      }

      const dedupeResult = await dedupeCheck(lead.pan, token);

      if (
        dedupeResult.status === "success" &&
        dedupeResult.message === "Lead already exists"
      ) {
        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              apiResponse: {
                moneyView: dedupeResult,
                status: "skipped",
                message: "Lead already exists",
                createdAt: new Date().toISOString(),
              },
              RefArr: {
                name: "MoneyView",
                createdAt: new Date().toISOString(),
              },
            },
            $unset: { accounts: "" },
          },
        );
        return;
      }

      const moneyViewResponse = await sendToMoneyView(lead, token);

      await UserDB.updateOne(
        { phone: lead.phone },
        {
          $push: {
            apiResponse: {
              moneyView: moneyViewResponse,
              createdAt: new Date().toISOString(),
            },
            RefArr: { name: "MoneyView", createdAt: new Date().toISOString() },
          },
          $unset: { accounts: "" },
        },
      );

      if (moneyViewResponse.status === "success") {
        successCount++;
        console.log(`✅ Lead success: ${lead.phone}`);
      } else {
        console.log(
          `⛔ API failed for ${lead.phone}: ${moneyViewResponse.message}`,
        );
      }
    } catch (err) {
      console.error(`❌ Error processing ${lead.phone}:`, err.message);
      await UserDB.updateOne(
        { phone: lead.phone },
        {
          $push: {
            RefArr: {
              name: "SkippedMoneyView",
              reason: `Error: ${err.message}`,
              createdAt: new Date().toISOString(),
            },
          },
        },
      );
    }
  });

  await Promise.allSettled(promises);
}

let totalLeads = 0;

async function Loop() {
  let token = await getToken();
  if (!token) {
    console.error("❌ No token. Exiting.");
    return;
  }

  while (true) {
    console.log("\n📦 Fetching next batch...");
    const leads = await UserDB.aggregate([
      {
        $match: {
          "RefArr.name": { $nin: ["MoneyView", "SkippedMoneyView"] },
        },
      },
      { $limit: BATCH_SIZE },
    ]);

    if (leads.length === 0) {
      console.log("✅ All leads processed.");
      break;
    }

    await processBatch(leads, token);
    totalLeads += leads.length;
    console.log(
      `📊 Total Processed: ${totalLeads}, ✅ Successful: ${successCount}`,
    );
  }

  console.log("🔌 Closing DB connection...");
  await mongoose.connection.close();
}

Loop();
