const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

const DEDUPE_API = "https://www.ramfincorp.com/new-api/customers/check_dedupe";
const LEAD_API = "https://www.ramfincorp.com/new-api/customers/lead_push";

const BATCH_SIZE = 5;
const Partner_id = "Keshvacredit";

async function dedupe(user) {
  try {
    const payload = {
      mobile: user.phone,
      pancard: user.pan,
    };

    const response = await axios.post(DEDUPE_API, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic cmFtZmluX2U2NmIxNmE5ZjZiNzQ5YTAzOTBmZWRjM2U4ZjNkZjZmOmI3YjJlZDU1MjM5NjA5NzM5NmQwOWE2N2RkZTI4NjUyMDNjZDMxYjA=",
      },
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

async function leadCreate(user) {
  try {
    const payload = {
      mobile: user.phone,
      pancard: user.pan,
      partner_Id: Partner_id,
    };

    const response = await axios.post(LEAD_API, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic cmFtZmluX2U2NmIxNmE5ZjZiNzQ5YTAzOTBmZWRjM2U4ZjNkZjZmOmI3YjJlZDU1MjM5NjA5NzM5NmQwOWE2N2RkZTI4NjUyMDNjZDMxYjA=",
      },
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
let successCount = 0;
async function processBatch(users) {
  const promises = users.map(async (user) => {
    const dedupeRes = await dedupe(user);
    const dedupeMsg = dedupeRes?.message || "";

    console.log(`📞 ${user.phone} => Dedupe:`, dedupeMsg);

    if (dedupeMsg.toLowerCase() === "dedup success") {
      const leadRes = await leadCreate(user);
      successCount++;
      if (leadRes) {
        const updatePayload = {
          $push: {
            apiResponse: {
              RamFin: {
                statusCode: leadRes.statusCode,
                message: leadRes.message,
                data: leadRes.data,
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

        try {
          const updateRes = await UserDB.updateOne(
            { phone: user.phone },
            updatePayload,
          );
          console.log(`✅ Updated DB for ${user.phone}:`, updateRes);
        } catch (err) {
          console.error(
            `❌ Failed to update DB for ${user.phone}:`,
            err.message,
          );
        }
      } else {
        console.error(
          `❌ leadCreate failed for ${user.phone}, skipping DB update.`,
        );
      }
    } else {
      console.log(
        `⚠️ Skipped Lead Create for ${user.phone} due to Dedupe failure.`,
      );
    }
  });

  await Promise.all(promises);
}

async function loop() {
  let processedCount = 0;
  try {
    let hasMoreLeads = true;

    while (hasMoreLeads) {
      console.log("🔄 Fetching users...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $ne: "RamFin" },
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        hasMoreLeads = false;
        console.log("🚫 No more leads to process.");
      } else {
        await processBatch(leads);
        processedCount += leads.length;
        console.log(`✅ Processed ${processedCount} leads so far.`);
      }
      console.log(`✅ successFully processed ${successCount} Leads.`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("🚫 Error in loop:", error.message);
  } finally {
    mongoose.connection.close();
    console.log("🔌 MongoDB connection closed.");
  }
}

loop();
