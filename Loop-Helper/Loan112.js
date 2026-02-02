const mongoose = require("mongoose");
const axios = require("axios");
const xlsx = require("xlsx");
const path = require("path"); // Added path module
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_RSUnity;
const BATCH_SIZE = 10;
const PINCODE_FILE_PATH = path.join(__dirname, "..", "xlsx", "Loan112.csv");

// Variable to store pincodes globally once loaded
let validPincodes = new Set();

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

const APIURL = "https://api.loan112fintech.com/marketing-push-lead-data";

async function GetHeader() {
  return {
    Username: "KESHVACREDIT_LOAN112_20260130",
    Auth: "a2945757d8e7aa55dd2d7c6888ca65e77c6c4c6c",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function loadValidPincodes() {
  try {
    const workbook = xlsx.readFile(PINCODE_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    const pincodes = new Set();
    data.forEach((row) => {
      if (row[0]) {
        pincodes.add(String(row[0]).trim());
      }
    });
    console.log(`✅ Loaded ${pincodes.size} valid pincodes from Excel.`);
    return pincodes;
  } catch (error) {
    console.error(`❌ Error loading pincode file: ${error.message}`);
    return new Set();
  }
}

async function SendToApi(user) {
  try {
    let genderCode = 1;
    if (user.gender) {
      const g = user.gender.toString().toLowerCase();
      if (g === "female" || g === "f" || g === "2") {
        genderCode = 2;
      } else {
        genderCode = 1;
      }
    }
    const Payload = {
      full_name: user.name || "",
      mobile: user.phone || "",
      email: user.email || "",
      pancard: user.pan || "",
      pincode: user.pincode || "",
      monthly_salary: user.income || 0,
      income_type: 1,
      dob: user.dob || "",
      gender: genderCode,
      next_salary_date: "2026-02-07",
      company_name: " ",
    };

    const headers = await GetHeader();
    const response = await axios.post(APIURL, Payload, { headers });
    console.log(`📡 API Success [${user.phone}]:`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ API Rejected [${user.phone}]:`, {
        status: error.response.status,
        data: error.response.data,
      });
      return { success: false, ...error.response.data };
    } else {
      console.error(`❌ Network/Request Error [${user.phone}]:`, error.message);
      return { success: false, status: 500, message: error.message };
    }
  }
}

async function processBatch(users) {
  let successCount = 0;

  await Promise.allSettled(
    users.map(async (user) => {
      try {
        const userDoc = await UserDB.findOne({ phone: user.phone });
        if (!userDoc) return;

        console.log(`🚀 Processing user: ${user.phone}`);

        const employment = userDoc.employment;
        const income = userDoc.income;
        const userPincode = String(userDoc.pincode || "").trim();

        // 1. Validation: Salaried
        if (employment !== "Salaried") {
          await skipUser(userDoc._id, `Skipped: Not Salaried (${employment})`, user.phone);
          return;
        }

        // 2. Validation: Income
        if (income < 25000) {
          await skipUser(userDoc._id, "Skipped: income less than 25K", user.phone);
          return;
        }

        // 3. Validation: Pincode Check ✅
        if (validPincodes.size > 0 && !validPincodes.has(userPincode)) {
          console.log(`⏩ Skipping user ${user.phone}: Pincode ${userPincode} not in service list.`);
          await skipUser(userDoc._id, `Skipped: Pincode ${userPincode} not serviceable`, user.phone);
          return;
        }

        // ✅ API Call
        const apiResponse = await SendToApi(userDoc);

        // ✅ Database Update for API Result
        const updateDoc = {
          $push: {
            apiResponse: {
              Loan112: apiResponse,
              createdAt: new Date().toLocaleString(),
            },
            RefArr: {
              name: "Loan112",
              status: (apiResponse.status === "success" || apiResponse.success) ? "Sent" : "Failed",
              message: apiResponse.error || apiResponse.message || "",
              createdAt: new Date().toLocaleString(),
            },
          },
          $unset: { accounts: "" },
        };

        await UserDB.updateOne({ _id: userDoc._id }, updateDoc);

        if (apiResponse.status === "success" || apiResponse.success === true) {
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing user ${user.phone}:`, error.message);
      }
    }),
  );

  return successCount;
}

// Helper function to handle DB updates for skipped users
async function skipUser(userId, message, phone) {
  console.log(`⏩ ${message} for ${phone}`);
  await UserDB.updateOne(
    { _id: userId },
    {
      $push: {
        RefArr: {
          name: "Loan112",
          message: message,
          createdAt: new Date().toLocaleString(),
        },
      },
      $unset: { accounts: "" },
    }
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // ✅ Load pincodes before starting
  validPincodes = loadValidPincodes();
  
  let hasMoreUsers = true;
  let totalAttributed = 0;

  console.log("🚦 Starting Loan112 Batch Processing...");

  try {
    while (hasMoreUsers) {
      const users = await UserDB.find({
        $or: [
          { RefArr: { $exists: false } },
          { "RefArr.name": { $ne: "Loan112" } },
        ],
      })
        .limit(BATCH_SIZE)
        .lean();

      if (users.length === 0) {
        hasMoreUsers = false;
        console.log("🏁 No more users found for processing.");
        break;
      }

      const batchSuccess = await processBatch(users);
      totalAttributed += batchSuccess;

      console.log(`📊 Batch Success: ${batchSuccess} | Total Success: ${totalAttributed}`);
      await delay(2000);
    }
    console.log("✅ Process Finished.");
  } catch (error) {
    console.error("❌ Fatal error in Main:", error);
  } finally {
    mongoose.disconnect();
    console.log("🔌 MongoDB connection closed.");
  }
}

main();
      }

      console.log(`📦 Found ${users.length} users. Starting batch...`);

      // ✅ Yahan processing trigger ho rahi hai
      const batchSuccess = await processBatch(users);
      totalAttributed += batchSuccess;

      console.log(
        `📊 Batch Success: ${batchSuccess} | Total Success: ${totalAttributed}`,
      );

      // ✅ 2 seconds delay to prevent overwhelming the API
      console.log("⏳ Waiting 2 seconds before next batch...");
      await delay(2000);
    }

    console.log("--------------------------------------------------");
    console.log(
      `✅ Process Finished. Total Leads Successfully Sent: ${totalAttributed}`,
    );
    console.log("--------------------------------------------------");
  } catch (error) {
    console.error("❌ Fatal error in Main:", error);
  } finally {
    mongoose.disconnect();
    console.log("🔌 MongoDB connection closed.");
  }
}

// Start the script
main();
