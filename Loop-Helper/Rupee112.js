const mongoose = require("mongoose");
const axios = require("axios");
// const readXlsxFile = require("../utils/readXlsxFile");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;
if (!MONGODB_URINEW) {
  console.error("MONGODB_URINEW is not defined in your .env file.");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);
//situ update
const MAX_PROCESS = 10000;
const BATCH_SIZE = 100;
const Partner_id = "Keshvacredit";
const DEDUPE_API_URL =
  "https://api.rupee112fintech.com/marketing-check-dedupe/";
const PushAPI_URL = "https://api.rupee112fintech.com/marketing-push-data";
const loanAmount = "20000";

const validPincodeRows = readXlsxFile("xlsx/rupee.xlsx");
const validPincodes = validPincodeRows.map((row) => String(row.Pincode).trim());
if (validPincodes.length === 0) {
  console.warn(
    "No valid pincodes loaded. All pincode-dependent leads will be skipped.",
  );
}

function getHeaders() {
  return {
    Username: "KESHVACREDIT_20250421",
    Auth: "a154c75adc5c96003c740668545c8ed59ff99f5ee520e8feb4b8087a41b2eb2a",
    "Content-Type": "application/json",
  };
}

const { v4: uuidv4 } = require("uuid");
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
      Partner_id,
    };
    console.log(`Sending Dedupe request for ${lead.phone}`);
    const response = await axios.post(DEDUPE_API_URL, FirstPayload, {
      headers: getHeaders(),
    });
    console.log(`Dedupe API Response for ${lead.phone}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(
      `Dedupe API Call Failed for ${lead.phone}:`,
      error.response?.data?.Error || error.message,
    );
    return {
      Status: 0,
      Error:
        error.response?.data?.Error || error.message || "Unknown Dedupe Error",
    };
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
      income_type: "1",
      monthly_salary: lead.income || "",
      purpose_of_loan: "3",
      loan_amount: loanAmount,
      Partner_id,
      customer_lead_id: generate7DigitId(),
    };

    console.log(`Sending Push request for ${lead.phone}`);
    const response = await axios.post(PushAPI_URL, apiRequestBody, {
      headers: getHeaders(),
    });

    console.log(
      `Marketing Push API Response for ${lead.phone}:`,
      response.data,
    );
    return response.data;
  } catch (err) {
    console.error(
      `Marketing Push API Error for ${lead.phone}:`,
      err.response?.data || err.message,
    );
    return {
      Status: 0,
      Error:
        err.response?.data?.message || err.message || "Unknown Push API Error",
    };
  }
}

async function processBatch(users) {
  let successCount = 0;

  await Promise.allSettled(
    users.map(async (user) => {
      try {
        if (user.RefArr && user.RefArr.some((r) => r.name === "Rupee112")) {
          console.log(`Skipping user ${user.phone}`);
          return;
        }

        const pincodeTrimmed = String(user.pincode || "").trim();
        if (!pincodeTrimmed || !validPincodes.includes(pincodeTrimmed)) {
          const reason = `Invalid or missing pincode: ${user.pincode}`;
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

        const { valid, reason } = isValidUser(user);
        if (!valid) {
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
        if (!userDoc) return;

        const dedupeResponse = await sendToDedupeAPI(user);

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

        if (
          dedupeResponse.Status === "2" ||
          dedupeResponse.Message === "User not found"
        ) {
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
          updateDoc.$push.apiResponse.Rupee112 = { ...dedupeResponse };
          updateDoc.$push.apiResponse.status =
            dedupeResponse.status || dedupeResponse.Status;
          updateDoc.$push.apiResponse.message =
            dedupeResponse.message || dedupeResponse.Error;
        }

        await UserDB.updateOne({ phone: user.phone }, updateDoc);
      } catch (error) {
        await UserDB.updateOne(
          { phone: user.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedRupee112Error",
                reason: `Unexpected error: ${error.message}`,
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
      }
    }),
  );

  return successCount;
}

async function Loop() {
  let successLeads = 0;

  try {
    while (successLeads < MAX_PROCESS) {
      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $ne: "Rupee112" },
          },
        },
        { $limit: BATCH_SIZE * 2 },
      ]);

      if (!leads.length) break;

      const validLeads = leads.filter((user) => {
        const userValidity = isValidUser(user);
        const pincodeTrimmed = String(user.pincode || "").trim();
        const isPincodeValid =
          pincodeTrimmed && validPincodes.includes(pincodeTrimmed);
        return userValidity.valid && isPincodeValid;
      });

      if (!validLeads.length) {
        if (leads.length < BATCH_SIZE * 2) break;
        await new Promise((resolve) => setImmediate(resolve));
        continue;
      }

      const remainingSlots = MAX_PROCESS - successLeads;
      const batchToProcess = validLeads.slice(
        0,
        Math.min(validLeads.length, remainingSlots),
      );

      if (batchToProcess.length === 0) break;

      const batchSuccess = await processBatch(batchToProcess);
      successLeads += batchSuccess;

      if (successLeads >= MAX_PROCESS) break;

      await new Promise((resolve) => setImmediate(resolve));
    }
  } catch (error) {
    console.error("Unhandled error in loop:", error);
  } finally {
    console.log("Disconnecting MongoDB.");
    mongoose.disconnect();
  }
}

Loop();
