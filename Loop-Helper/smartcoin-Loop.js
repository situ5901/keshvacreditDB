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

const BATCH_SIZE = 1;
const Partner_id = "Keshvacredit";

const PRE_APPROVAL_API =
  "https://leads.smartcoin.co.in/partner/keshvacredit/lead/create";

function getHeaders() {
  return {
    "Content-Type": "application/x-www-form-urlencoded",
    "admin-api-client-id": "SC_KVCD_oruwm5w5fXy4JNoi",
    "admin-api-client-key": "esy7kphMG6G9hu90",
  };
}

// ✅ PAN Validator
function isValidPAN(pan) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
}

async function getPreApproval(lead) {
  try {
    const payload = {
      phone_number: String(lead.phone),
      pan: lead.pan,
      employment_type: lead.employment,
      net_monthly_income: lead.income,
      name_as_per_pan: lead.name,
      date_of_birth: lead.dob,
      Partner_id: Partner_id,
    };

    console.log("📤 Sending PreApproval Payload:", payload);

    const response = await axios.post(PRE_APPROVAL_API, qs.stringify(payload), {
      headers: getHeaders(),
    });

    console.log("✅ PreApproval API Response:", response.data);

    if (response.data.status === "success") {
      console.log(
        "🎉 Lead created successfully with Lead ID:",
        response.data.leadId,
      );
      return response.data;
    } else {
      console.error("❌ Failed to create lead:", response.data.message);
      return {
        status: "FAILED",
        message: response.data.message || "Unknown error",
        pan: lead.pan, // Include PAN for debugging
      };
    }
  } catch (err) {
    console.error(
      "❌ PreApproval API Error:",
      err.response?.data || err.message,
    );
    return {
      status: "FAILED",
      message: err.response?.data?.message || err.message || "Unknown Error",
      pan: lead.pan, // Include PAN for debugging
    };
  }
}

async function processBatch(leads) {
  const promises = leads.map(async (lead) => {
    try {
      if (
        !lead.phone ||
        !lead.pan ||
        !lead.employment ||
        !lead.income ||
        !lead.name ||
        !lead.dob
      ) {
        console.error(
          `❌ Incomplete data for lead: ${lead.phone}. Skipping this lead.`,
        );

        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedSmartcoin",
                reason: "Incomplete Data",
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      // ✅ PAN validation BEFORE API call
      if (!isValidPAN(lead.pan)) {
        console.error(
          `❌ Invalid PAN format for lead: ${lead.phone} with PAN: ${lead.pan}. Skipping this lead.`,
        );

        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedSmartcoin",
                reason: `Invalid PAN format: ${lead.pan}`,
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      const userDoc = await UserDB.findOne({ phone: lead.phone });

      if (userDoc?.RefArr?.some((ref) => ref.name === "Smartcoin")) {
        console.log(`⛔ Lead already processed for SmartCoin: ${lead.phone}`);
        return;
      }

      const updates = {};
      let needUpdate = false;

      if (userDoc.apiResponse && !Array.isArray(userDoc.apiResponse)) {
        updates.apiResponse = [userDoc.apiResponse];
        needUpdate = true;
      }

      if (userDoc.preApproval && !Array.isArray(userDoc.preApproval)) {
        updates.preApproval = [userDoc.preApproval];
        needUpdate = true;
      }

      if (needUpdate) {
        await UserDB.updateOne({ phone: lead.phone }, { $set: updates });
      }

      const preApprovalResponse = await getPreApproval(lead);
      console.log("✅ PreApproval Response:", preApprovalResponse);

      if (preApprovalResponse.status === "success") {
        const updateDoc = {
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
        };

        console.log("✅ Lead created successfully in Pre-Approval API.");
        await UserDB.updateOne({ phone: lead.phone }, updateDoc);
      } else {
        console.log(
          "⛔ Pre-Approval failed:",
          preApprovalResponse.message,
          "PAN:",
          preApprovalResponse.pan,
        );
        if (
          preApprovalResponse.message?.includes(
            "mandatory field PAN is incorrect",
          )
        ) {
          console.log(
            `❌ API rejected PAN: ${preApprovalResponse.pan} for lead ${lead.phone}. Marking as skipped.`,
          );
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
      console.error("❌ Error processing lead:", err.message);
    }
  });

  await Promise.all(promises);
}

async function Loop() {
  try {
    while (true) {
      console.log("📦 Fetching new leads...");
      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $nin: ["Smartcoin", "SkippedSmartcoin"] },
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("✅ All leads processed. No more new data.");
        break;
      }

      await processBatch(leads);
    }
  } catch (error) {
    console.error("❌ Error occurred in loop:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

Loop();

