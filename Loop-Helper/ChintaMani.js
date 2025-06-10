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

const PINCODE_FILE_PATH = path.join(__dirname, "..", "xlsx", "pincode.xlsx");

const API_URL =
  "https://www.chintamanifinlease.com/api/chintamanifinleaseDsaPartnerTest";
const MAX_LEADS = 1;
const Partner_id = "Keshvacredit";

function loadValidPincodes(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);
  return data.map((row) => String(row.Pincode).trim());
}

const validPincodes = loadValidPincodes(PINCODE_FILE_PATH);
function getHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

async function sendToNewAPI(lead) {
  const response = {};

  if (!validPincodes.includes(String(lead.pincode).trim())) {
    response.status = "failed";
    response.message = `❌ Invalid pincode: ${lead.pincode}`;
    return response;
  }

  try {
    const requestBody = {
      mobile_number: lead.phone,
      email_id: lead.email,
      pan_buss_number: lead.pan,
      fname: lead.name,
      current_pincode: lead.pincode,
      d_o_b: lead.dob,
      gender: lead.gender,
      monthly_income: lead.income,
      Partner_id: Partner_id,
    };

    console.log("📤 Sending Lead:", JSON.stringify(requestBody, null, 2));

    const apiResponse = await axios.post(API_URL, requestBody, {
      headers: getHeaders(),
    });

    response.status = apiResponse.status;
    response.token = apiResponse.data.token;
    response.message = apiResponse.data.status;
  } catch (error) {
    response.status = "failed";
    response.message = error.response?.data?.response_message || error.message;
  }

  return response;
}

async function processBatch(users) {
  const promises = users.map(async (user) => {
    const existingUser = await UserDB.findOne({ phone: user.phone });

    if (existingUser && existingUser.isSentToAPI) {
      console.log(`📞 ${user.phone} already processed, skipping...`);
      return { status: "skipped", message: "Already processed" };
    }

    return sendToNewAPI(user);
  });

  const results = await Promise.allSettled(promises);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const result = results[i];

    const value =
      result.status === "fulfilled"
        ? result.value
        : {
            status: "failed",
            message: result.reason?.message || "Unknown error",
          };

    console.log(`📞 ${user.phone} => 🧾`, value);

    const updateResponse = await UserDB.updateOne(
      { phone: user.phone },
      {
        $push: {
          apiResponse: {
            chintamani: value,
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: "chintamani",
            createdAt: new Date().toISOString(),
          },
        },
        $set: { isSentToAPI: true },
        $unset: { accounts: "" },
      },
    );

    console.log(`✅ Mongo Updated: ${user.phone}`, updateResponse);
  }
}

let processedCount = 0;

async function loop() {
  try {
    let hasMoreLeads = true;

    while (hasMoreLeads) {
      console.log("🔄 Fetching new leads...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            processed: { $ne: true },
            "RefArr.name": { $ne: "kamakshi" },
            isSentToAPI: { $ne: true },
          },
        },
        { $limit: MAX_LEADS },
      ]);

      if (leads.length === 0) {
        hasMoreLeads = false;
        console.log("🚫 No more leads to process.");
      } else {
        await processBatch(leads);
        processedCount += leads.length;
        console.log(`✅ Total Processed: ${processedCount}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("⏳ Waiting for 1 second before next batch...");
      }
    }
  } catch (err) {
    console.error("🚨 Error in loop:", err.message);
  } finally {
    mongoose.connection.close();
  }
}

loop();
