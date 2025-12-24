const mongoose = require("mongoose");
const axios = require("axios");
const path = require("path");
const xlsx = require("xlsx");
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll2",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

const BATCH_SIZE = 100;
const Partner_id = "Keshvacredit";
const DEDUPE_API_URL =
  "https://api.rupee112fintech.com/marketing-check-dedupe/";
const PushAPI_URL = "https://api.rupee112fintech.com/marketing-push-data";
const loanAmount = "20000";

const PINCODE_FILE_PATH = path.join(__dirname, "..", "xlsx", "rupee.xlsx");

function loadValidPincodes(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    return data.map((row) => String(row.Pincode).trim());
  } catch (error) {
    console.error(
      `❌ Error loading valid pincodes from ${filePath}:`,
      error.message,
    );
    return [];
  }
}

const validPincodes = loadValidPincodes(PINCODE_FILE_PATH);

function getHeaders() {
  return {
    Username: "KESHVACREDIT_20250421",
    Auth: "a154c75adc5c96003c740668545c8ed59ff99f5ee520e8feb4b8087a41b2eb2a",
    "Content-Type": "application/json",
  };
}

const generate7DigitId = () => {
  const uuid = uuidv4();
  const digits = uuid.replace(/\D/g, "");
  return digits.slice(0, 7);
};

function isValidUser(user) {
  const empType = (user.employmentType || "").toLowerCase().trim();

  if (empType !== "salaried") {
    return {
      valid: false,
      reason: `Invalid employment type: ${user.employmentType}`,
    };
  }

  const age = Number(user.age);
  if (isNaN(age) || age < 25 || age > 50) {
    return { valid: false, reason: `Invalid age: ${user.age}` };
  }

  return { valid: true };
}

async function sendToDedupeAPI(lead) {
  try {
    const FirstPayload = {
      mobile: lead.phone,
      pancard: lead.pan,
      Partner_id: Partner_id,
    };
    console.log("📤 Sending Lead Data to Dedupe API:", FirstPayload);

    const response = await axios.post(DEDUPE_API_URL, FirstPayload, {
      headers: getHeaders(),
    });

    console.log("✅ Dedupe API Response Received:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "🚫 Dedupe API Call Failed for",
      lead.phone,
      ":",
      error.message,
    );
    return { Status: 0, Error: error.response?.data?.Error || error.message };
  }
}

async function sendToPunshAPI(lead) {
  try {
    const apiRequestBody = {
      full_name: lead.name || "",
      mobile: lead.phone || "",
      email: lead.email || "",
      pancard: lead.pan || "",
      pincode: lead.pincode || "",
      income_type: "1", // salaried
      monthly_salary: lead.income || "",
      purpose_of_loan: "3",
      loan_amount: loanAmount,
      Partner_id: Partner_id,
      customer_lead_id: generate7DigitId(),
    };

    console.log("📤 Sending Lead Data to Marketing Push API:", apiRequestBody);

    const response = await axios.post(PushAPI_URL, apiRequestBody, {
      headers: getHeaders(),
    });

    console.log("✅ Marketing Push API Response Received:", response.data);
    return response.data;
  } catch (err) {
    console.error(
      "❌ PreApproval API Error:",
      err.response?.data || err.message,
    );
    return {
      Status: 0,
      Error: err.response?.data?.message || err.message || "Unknown Error",
    }validPincodes;
  }
}

async function processBatch(users) {
  let successCount = 0;

  const results = await Promise.allSettled(
    users.map(async (user) => {
      if (user.RefArr && user.RefArr.some((r) => r.name === "Rupee112")) {
        console.log(`⏭️ Skipping user ${user.phone} as already processed.`);
        return;
      }

      if (
        !user.pincode ||
        !validPincodes.includes(String(user.pincode).trim())
      ) {
        console.error(
          `❌ Invalid pincode: ${user.pincode} for user: ${user.phone}. Skipping.`,
        );
        await UserDB.updateOne(
          { phone: user.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedRupee112",
                reason: `Invalid pincode: ${user.pincode}`,
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      const { valid, reason } = isValidUser(user);
      if (!valid) {
        console.error(`❌ Skipping user ${user.phone}: ${reason}`);
        await UserDB.updateOne(
          { phone: user.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedRupee112",
                reason,
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      const userDoc = await UserDB.findOne({ phone: user.phone });
      if (!userDoc) {
        console.log(`❌ User with phone ${user.phone} not found in DB.`);
        return;
      }

      const response = await sendToDedupeAPI(user);

      let updateDoc = {
        $unset: { accounts: "" },
        $push: {
          apiResponse: {
            Rupee112: {},
            status: "",
            message: "",
            createdAt: new Date().toISOString(),
          },
        },
        $addToSet: {
          RefArr: { name: "Rupee112" },
        },
      };

      if (response.Status === "2" || response.Message === "User not found") {
        const pushResponse = await sendToPunshAPI(user);

        updateDoc.$push.apiResponse.Rupee112 = { ...pushResponse };
        updateDoc.$push.apiResponse.status =
          pushResponse.status || pushResponse.Status;
        updateDoc.$push.apiResponse.message =
          pushResponse.message || pushResponse.Error;

        if (
          pushResponse.Status === 1 &&
          pushResponse.Message === "Lead Created Successfuly"
        ) {
          successCount += 1;
        }
      } else {
        updateDoc.$push.apiResponse.Rupee112 = { ...response };
        updateDoc.$push.apiResponse.status = response.status || response.Status;
        updateDoc.$push.apiResponse.message =
          response.message || response.Error;
      }

      await UserDB.updateOne({ phone: user.phone }, updateDoc);
    }),
  );

  return successCount;
}

async function Loop() {
  let successLeads = 0;

  try {
    while (true) {
      console.log("📦 Fetching leads...");
      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $ne: "Rupee112" },
          },
        },
        { $limit: BATCH_SIZE * 2 }, // Fetch more to compensate for invalids
      ]);

      if (!leads.length) {
        console.log("🎉 All leads processed. Exiting loop.");
        break;
      }

      // ✅ Filter valid users before processing
      const validLeads = leads.filter((user) => {
        const isValid = isValidUser(user);
        return (
          isValid.valid &&
          user.pincode &&
          validPincodes.includes(String(user.pincode).trim())
        );
      });

      if (!validLeads.length) {
        console.log("❌ No valid leads in this batch.");
        break;
      }

      const batchToProcess = validLeads.slice(0, remaining);

      const batchSuccess = await processBatch(batchToProcess);

      successLeads += batchSuccess;

      console.log(`✅ Processed valid leads: ${batchToProcess.length}`);
      console.log(`🌟 Total Successfully Created Leads: ${successLeads}`);

      if (successLeads >= MAX_PROCESS) {
        console.log("🎯 Reached 5000 successful leads. Stopping.");
        break;
      }

      await new Promise((resolve) => setImmediate(resolve));
    }
  } catch (error) {
    console.error("❌ Error in loop:", error);
  }
}
Loop();
