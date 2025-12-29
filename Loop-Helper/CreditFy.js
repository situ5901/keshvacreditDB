const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_RSUnity;
const BATCH_SIZE = 10;

const API_URL = "https://agency.ctpl.live/lead/ingest/keshva_credit";

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "creditfy",
  new mongoose.Schema({}, { collection: "creditfy", strict: false }),
);

async function CallApiForLead(user) {
  try {
    const payload = {
      phoneNumber: user.phone,
      panNumber: user.pan,
      data: {
        email: user.email,
        customer_name: user.name,
        dob: user.dob,
        emp_type: "organic",
        salary: user.salary,
        city: user.city,
        pincode: user.pincode,
      },
    };

    const response = await axios.post(API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic cmFtZmluX2U2NmIxNmE5ZjZiNzQ5YTAzOTBmZWRjM2U4ZjNkZjZmOmI3YjJlZDU1MjM5NjA5NzM5NmQwOWE2N2RkZTI4NjUyMDNjZDMxYjA=",
      },
    });
    
    return response.data; 

  } catch (err) {
    console.error(`❌ Error calling API for user ${user.phone}:`, err.message);
    if (err.response) {
      console.error('API Response Data:', err.response.data);
      return { error: 'API Call Failed', details: err.response.data };
    }
    throw new Error(`API call failed: ${err.message}`);
  }
}

async function processBatch(users) {
  let attributedSuccessfullyCount = 0;

  const results = await Promise.allSettled(
    users.map(async (user) => {
      try {
        const userDoc = await UserDB.findOne({ phone: user.phone });
        if (!userDoc) {
          console.warn(
            `User with phone ${user.phone} not found in DB. Skipping.`,
          );
          return;
        }

        console.log(`🚀 Processing user: ${user.phone}`);

        const employment = userDoc.employment;
        const income = Number(userDoc.income);

        if (employment !== "Salaried" || income < 25000) {
          console.log(
            `⏩ Skipping user ${user.phone} due to employment (${employment}) or income (${income})`,
          );

          const updateDoc = {
            $push: {
              RefArr: {
                name: "CreditFy", 
                message: "Skipped due to employment or income",
                createdAt: new Date().toISOString(),
              },
            },
            $unset: { accounts: "" },
          };

          await UserDB.updateOne({ phone: user.phone }, updateDoc); 
          return;
        }

        const leadCreateResponse = await CallApiForLead(user);

        const updateDoc = {
          $push: {
            apiResponse: {
              CreditFy: { 
                leadCreate: leadCreateResponse, 
              },
              createdAt: new Date().toISOString(),
            },
            RefArr: {
              name: "CreditFy", 
              message: "API Call completed",
              createdAt: new Date().toISOString(),
            },
          },
          $unset: { accounts: "" },
        };

        await UserDB.updateOne({ phone: user.phone }, updateDoc); 
        console.log(`✅ Database updated for user: ${user.phone}`);


      } catch (error) {
        console.error(
          `❌ Failed to process user ${user.phone} in batch:`,
          error.message,
        );
        throw error;
      }
    }),
  );

  return attributedSuccessfullyCount;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let totalAttributedSuccessfully = 0;
  let skip = 0;
  let hasMoreUsers = true;

  console.log("🚦 Starting user processing...");

  try {
    while (hasMoreUsers) {
      const users = await UserDB.find({
        $or: [
          { RefArr: { $exists: false } },
          { "RefArr.name": { $ne: "CreditFy" } }, 
        ],
      })
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      if (users.length === 0) {
        hasMoreUsers = false;
        break;
      }

      const batchAttributedCount = await processBatch(users);
      console.log(
        `📊 Batch Completed: ${batchAttributedCount} users attributed successfully.`,
      );
      totalAttributedSuccessfully += batchAttributedCount;

      skip += users.length;

      console.log("⏳ Waiting 1 seconds before next batch...");
      await delay(1000);
    }

    console.log("--------------------------------------------------");
    console.log("✅ All batches processed.");
    console.log(
      `🎯 Total Leads Attributed Successfully: ${totalAttributedSuccessfully}`,
    );
    console.log("--------------------------------------------------");
  } catch (error) {
    console.error("❌ Fatal error during main processing:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB connection closed.");
  }
}

main();
