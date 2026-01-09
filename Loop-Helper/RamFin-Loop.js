const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_BLACKCOVER;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "fatakpay",
  new mongoose.Schema({}, { collection: "fatakpay", strict: false }),
);

const DEDUPE_API = "https://www.ramfincorp.com/new-api/customers/check_dedupe";
const LEAD_API = "https://www.ramfincorp.com/new-api/customers/lead_push";
const BATCH_SIZE = 5;
const Partner_id = "Keshvacredit";

const AUTH_HEADER = {
  "Content-Type": "application/json",
  Authorization:
    "Basic cmFtZmluX2U2NmIxNmE5ZjZiNzQ5YTAzOTBmZWRjM2U4ZjNkZjZmOmI3YjJlZDU1MjM5NjA5NzM5NmQwOWE2N2RkZTI4NjUyMDNjZDMxYjA=",
};


// ✅ Dedupe API
async function dedupe(user) {
  try {
    const payload = {
      mobile: user.phone,
      pancard: user.pan,
    };

    const response = await axios.post(DEDUPE_API, payload, {
      headers: AUTH_HEADER,
    });

    return response.data;
  } catch (err) {
    console.error(
      "❌ Error in Dedupe API for",
      user.phone,
      ":",
      err.response?.data || err.message,
    );
    return null;
  }
}

// ✅ Lead Create API
async function leadCreate(user) {
  try {
    const payload = {
      mobile: user.phone,
      pancard: user.pan,
      partner_Id: Partner_id,
    };

    const response = await axios.post(LEAD_API, payload, {
      headers: AUTH_HEADER,
    });

    return response.data;
  } catch (err) {
    console.error(
      "❌ Error in Lead Create API for",
      user.phone,
      ":",
      err.response?.data || err.message,
    );
    return null;
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
        const income = Number(userDoc.income); // Ensure number type

        // ✅ Skip if not Salaried or income < 18000
        if (employment !== "Salaried" || income < 18000) {
          console.log(
            `⏩ Skipping user ${user.phone} due to employment (${employment}) or income (${income})`,
          );

          const updateDoc = {
            $push: {
              RefArr: {
                name: "RamFin",
                message: "Skipped due to employment or income",
                createdAt: new Date().toISOString(),
              },
            },
            $unset: { accounts: "" },
          };

          await UserDB.updateOne({ _id: userDoc._id }, updateDoc);
          return;
        }

        // ✅ Hit APIs if user qualifies
        const [dedupeResponse, leadCreateResponse] = await Promise.all([
          dedupe(user),
          leadCreate(user),
        ]);

        const updateDoc = {
          $push: {
            apiResponse: {
              Ramfin: {
                dedupe: dedupeResponse,
                leadCreate: leadCreateResponse,
              },
              createdAt: new Date().toISOString(),
            },
            RefArr: {
              name: "RamFin",
              createdAt: new Date().toISOString(),
            },
          },
          $unset: { accounts: "" },
        };

        await UserDB.updateOne({ _id: userDoc._id }, updateDoc);
        console.log(`✅ Database updated for user: ${user.phone}`);

        if (
          leadCreateResponse &&
          typeof leadCreateResponse.message === "string" &&
          leadCreateResponse.message.includes("Attributed Successfully")
        ) {
          attributedSuccessfullyCount++;
          console.log(`⭐ Lead Attributed Successfully for: ${user.phone}`);
        }
      } catch (error) {
        console.error(
          `❌ Failed to process user ${user.phone} in batch:`,
          error.message,
        );
      }
    }),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`Batch item ${index} rejected:`, result.reason);
    }
  });

  return attributedSuccessfullyCount;
}

// ✅ Delay function between batches
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ✅ Main function to handle batch processing
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
          { "RefArr.name": { $ne: "RamFin" } },
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

      // 🕒 Wait 5 seconds before next batch
      console.log("⏳ Waiting 5 seconds before next batch...");
      await delay(5000);
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
    mongoose.disconnect();
    console.log("🔌 MongoDB connection closed.");
  }
}

// ✅ Start the process
main();
