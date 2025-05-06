const mongoose = require("mongoose");
const axios = require("axios");
const qs = require("qs");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

const BATCH_SIZE = 100; // ⬆️ Increase batch size
const CONCURRENCY = 10; // ⬆️ Number of batches processed in parallel
const Partner_id = "Keshvacredit";
const PRE_APPROVAL_API =
  "https://leads.smartcoin.co.in/partner/keshvacredit/lead/create";

let successCount = 0;

function getHeaders() {
  return {
    "Content-Type": "application/x-www-form-urlencoded",
    "admin-api-client-id": "SC_KVCD_oruwm5w5fXy4JNoi",
    "admin-api-client-key": "esy7kphMG6G9hu90",
  };
}

function isValidPAN(pan) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
}

function formatDOB(dob) {
  if (!dob) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;
  if (/^\d{2}-\d{2}-\d{4}$/.test(dob)) {
    const [dd, mm, yyyy] = dob.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  try {
    const date = new Date(dob);
    return date.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

async function getPreApproval(lead) {
  try {
    const payload = {
      phone_number: String(lead.phone),
      pan: lead.pan,
      employment_type: lead.employment,
      net_monthly_income: lead.income || 0,
      name_as_per_pan: lead.name,
      date_of_birth: formatDOB(lead.dob),
      Partner_id: Partner_id,
    };

    const response = await axios.post(PRE_APPROVAL_API, qs.stringify(payload), {
      headers: getHeaders(),
      timeout: 10000, // Timeout after 10 sec
    });

    if (
      response.data.status === "success" &&
      response.data.message === "Lead created successfully"
    ) {
      successCount++;
      return response.data;
    } else {
      return {
        status: "FAILED",
        message: response.data.message || "Unknown error",
        pan: lead.pan,
      };
    }
  } catch (err) {
    return {
      status: "FAILED",
      message: err.response?.data?.message || err.message || "Unknown Error",
      pan: lead.pan,
    };
  }
}

async function processBatch(leads) {
  await Promise.allSettled(
    leads.map(async (lead) => {
      try {
        if (!lead.phone || !lead.name || !lead.dob || !lead.pan) {
          await UserDB.updateOne(
            { phone: lead.phone },
            {
              $push: {
                RefArr: {
                  name: "SkippedSmartcoin",
                  reason: "Incomplete data",
                  createdAt: new Date().toISOString(),
                },
              },
            },
          );
          return;
        }

        if (!isValidPAN(lead.pan)) {
          await UserDB.updateOne(
            { phone: lead.phone },
            {
              $push: {
                RefArr: {
                  name: "SkippedSmartcoin",
                  reason: "Invalid PAN",
                  createdAt: new Date().toISOString(),
                },
              },
            },
          );
          return;
        }

        const userDoc = await UserDB.findOne({ phone: lead.phone });

        if (userDoc?.RefArr?.some((r) => r.name === "Smartcoin")) return;

        const preApprovalResponse = await getPreApproval(lead);

        if (preApprovalResponse.status === "success") {
          await UserDB.updateOne(
            { phone: lead.phone },
            {
              $push: {
                apiResponse: {
                  smartcoin: preApprovalResponse,
                  status: preApprovalResponse.status,
                  message: preApprovalResponse.message,
                  createdAt: new Date().toISOString(),
                },
                RefArr: {
                  name: "Smartcoin",
                  createdAt: new Date().toISOString(),
                },
              },
              $unset: { accounts: "" },
            },
          );
        } else {
          if (
            preApprovalResponse.message?.includes(
              "mandatory field PAN is incorrect",
            )
          ) {
            await UserDB.updateOne(
              { phone: lead.phone },
              {
                $push: {
                  RefArr: {
                    name: "SkippedSmartcoin",
                    reason: `API rejected PAN: ${preApprovalResponse.pan}`,
                    createdAt: new Date().toISOString(),
                  },
                },
              },
            );
          }
        }
      } catch (err) {
        console.error("❌ Error in batch:", err.message);
      }
    }),
  );
}

async function Loop() {
  try {
    while (true) {
      const batchFetchPromises = [];

      for (let i = 0; i < CONCURRENCY; i++) {
        batchFetchPromises.push(
          UserDB.aggregate([
            {
              $match: {
                "RefArr.name": { $nin: ["Smartcoin", "SkippedSmartcoin"] },
              },
            },
            { $limit: BATCH_SIZE },
          ]),
        );
      }

      const batchResults = await Promise.all(batchFetchPromises);

      const nonEmptyBatches = batchResults.filter((batch) => batch.length > 0);

      if (nonEmptyBatches.length === 0) {
        console.log("✅ All leads processed.");
        break;
      }

      await Promise.allSettled(nonEmptyBatches.map(processBatch));

      console.log(`📊 Total Leads Sent So Far: ${successCount}`);
    }
  } catch (error) {
    console.error("❌ Loop Error:", error.message);
  } finally {
    console.log("🔌 Closing DB...");
    console.log(`🎯 Final Success Count: ${successCount}`);
    mongoose.connection.close();
  }
}

Loop();
