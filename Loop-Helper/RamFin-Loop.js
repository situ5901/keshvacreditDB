const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

// --- Configuration ---
const MONGODB_URINEW = process.env.MONGODB_URINEW;
const DEDUPE_API = "https://www.ramfincorp.com/new-api/customers/check_dedupe";
const LEAD_API = "https://www.ramfincorp.com/new-api/customers/lead_push";
const BATCH_SIZE = 5;
const Partner_id = "Keshvacredit";

const AUTH_HEADER = {
  "Content-Type": "application/json",
  Authorization:
    "Basic cmFtZmluX2U2NmIxNmE5ZjZiNzQ5YTAzOTBmZWRjM2U4ZjNkZjZmOmI3YjJlZDU1MjM5NjA5NzM5NmQwOWE2N2RkZTI4NjUyMDNjZDMxYjA=",
};

// --- MongoDB Connection ---
mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "testdb",
  new mongoose.Schema({}, { collection: "testdb", strict: false }),
);

// 🔹 Dedupe API Call
// This function now returns the entire response data object, whether it's success or an error.
async function dedupe(user) {
  try {
    const payload = {
      mobile: user.phone,
      pancard: user.pan,
    };

    console.log("📦 Sending Dedupe Payload:", payload);

    const response = await axios.post(DEDUPE_API, payload, {
      headers: AUTH_HEADER,
    });

    console.log("📩 Raw Dedupe Response:", response.data);

    // ✅ Return the entire response data object
    return response.data;
  } catch (err) {
    console.error(
      "❌ Error in Dedupe API for",
      user.phone,
      ":",
      err.response?.data || err.message,
    );
    // ✅ Return the error response data object instead of null
    return err.response?.data || null;
  }
}

// 🔹 Lead Create API Call
// This function also returns the entire response data object, whether it's success or an error.
async function leadCreate(user) {
  try {
    const payload = {
      mobile: user.phone,
      pancard: user.pan,
      partner_Id: Partner_id,
    };

    console.log("📦 Sending LeadCreate Payload:", payload);

    const response = await axios.post(LEAD_API, payload, {
      headers: AUTH_HEADER,
    });

    console.log("📩 Raw LeadCreate Response:", response.data);

    // ✅ Return the entire response data object
    return response.data;
  } catch (err) {
    console.error(
      "❌ Error in Lead Create API for",
      user.phone,
      ":",
      err.response?.data || err.message,
    );
    // ✅ Return the error response data object instead of null
    return err.response?.data || null;
  }
}

// 🔹 Process Batch
async function processBatch(users) {
  let attributedSuccessfullyCount = 0;

  const results = await Promise.allSettled(
    users.map(async (user) => {
      try {
        const userDoc = await UserDB.findOne({ phone: user.phone });
        if (!userDoc) {
          console.warn(
            `⚠️ User with phone ${user.phone} not found in DB. Skipping.`,
          );
          return;
        }

        console.log(`🚀 Processing user: ${user.phone}`);

        const [dedupeResponse, leadCreateResponse] = await Promise.all([
          dedupe(user),
          leadCreate(user),
        ]);

        const updateDoc = {
          $push: {
            apiResponse: {
              Ramfin: {
                // Store the full response objects here, including errors
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

        // Check if the leadCreateResponse object exists and contains the success message
        if (
          leadCreateResponse &&
          typeof leadCreateResponse === "object" &&
          leadCreateResponse.message &&
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

// 🔹 Delay Function
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 🔹 Main Runner
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

      // 🕒 Wait for 3 seconds before hitting the next batch
      console.log("⏳ Waiting 3 seconds before next batch...");
      await delay(3000);
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

main();
