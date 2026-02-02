const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_RSUnity;
const BATCH_SIZE = 10;

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
      next_salary_date: "2026-02-07", // Ensure this is within 40 days of today
      company_name: " ",
    };

    const headers = await GetHeader();
    const response = await axios.post(APIURL, Payload, { headers });

    // ✅ Log Full Success Response
    console.log(
      `📡 API Success [${user.phone}]:`,
      JSON.stringify(response.data, null, 2),
    );

    return response.data;
  } catch (error) {
    // ✅ Log Detailed Error Response from API
    if (error.response) {
      console.error(`❌ API Rejected [${user.phone}]:`, {
        status: error.response.status,
        data: error.response.data, // This contains the "message" or "error" field from the server
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
        if (!userDoc) {
          console.warn(`⚠️ User ${user.phone} not found in DB. Skipping.`);
          return;
        }

        console.log(`🚀 Processing user: ${user.phone}`);

        const employment = userDoc.employment;
        const income = userDoc.income;
        // ✅ Validation: Only Salaried allowed
        if (employment !== "Salaried") {
          console.log(
            `⏩ Skipping user ${user.phone}: Not Salaried (${employment})`,
          );

          await UserDB.updateOne(
            { _id: userDoc._id },
            {
              $push: {
                RefArr: {
                  name: "Loan112",
                  message: "Skipped: Not Salaried",
                  createdAt: new Date().toISOString(),
                },
              },
              $unset: { accounts: "" }, // Ensure field name matches your DB (account vs accounts)
            },
          );
          return;
        }

        if (income < 25000) {
          console.log(
            `⏩ Skipping user ${user.phone}: income less then 25K (${employment})`,
          );

          await UserDB.updateOne(
            { _id: userDoc._id },
            {
              $push: {
                RefArr: {
                  name: "Loan112",
                  message: "Skipped: income less then 25K",
                  createdAt: new Date().toISOString(),
                },
              },
              $unset: { accounts: "" }, // Ensure field name matches your DB (account vs accounts)
            },
          );
          return;
        }
        // ✅ API Call
        const apiResponse = await SendToApi(userDoc);

        // ✅ Database Update
        const updateDoc = {
          $push: {
            apiResponse: {
              Loan112: apiResponse,
              createdAt: new Date().toISOString(),
            },
            RefArr: {
              name: "Loan112",
              status:
                apiResponse.status === "success" || apiResponse.success
                  ? "Sent"
                  : "Failed",
              createdAt: new Date().toISOString(),
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let hasMoreUsers = true;
  let totalAttributed = 0;

  console.log("🚦 Starting Loan112 Batch Processing...");

  try {
    while (hasMoreUsers) {
      // Find users who haven't been processed for Loan112 yet
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
