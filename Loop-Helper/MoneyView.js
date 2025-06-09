const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "Test",
  new mongoose.Schema({}, { collection: "Test", strict: false }),
);

const TOKEN_API = "https://atlas.whizdm.com/atlas/v1/token";
const DEDUPE_API = "https://atlas.whizdm.com/atlas/v1/lead/filter/pan";
const LEAD_API = "https://atlas.whizdm.com/atlas/v1/lead";
const PARTNER_CODE = 422;
const BATCH_SIZE = 1;

let successCount = 0;

async function getToken() {
  try {
    const response = await axios.post(TOKEN_API, {
      userName: "keshvacredit",
      password: "Zb'91O(Nhy",
      partnerCode: PARTNER_CODE,
    });
    console.log("🔑 Token fetched successfully.");
    return response.data.token;
  } catch (error) {
    console.error(
      "❌ Error Fetching Token:",
      error.response?.data || error.message,
    );
    return null;
  }
}

async function dedupeCheck(pan, token) {
  console.log(`🔍 Performing Dedupe Check for PAN: ${pan}`);
  try {
    const response = await axios.get(`${DEDUPE_API}/${pan}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(
      "✅ Dedupe API Response:",
      JSON.stringify(response.data, null, 2),
    );
    return {
      status: response.data.status,
    };
  } catch (error) {
    console.error(
      `❌ Dedupe API Error for PAN ${pan}:`,
      error.response?.data || error.message,
    );
    return {
      status: "failure",
    };
  }
}

async function sendToMoneyView(lead, token) {
  const requestBody = {
    partnerCode: PARTNER_CODE,
    partnerRef: "keshvacredit",
    phone: lead.phone,
    pan: lead.pan.trim(),
    name: lead.name.trim(),
    gender: lead.gender.toLowerCase(),
    dateofbirth: lead.dob, // correct iso format
    employmenttype: lead.employment,
    declaredincome: lead.income,
  };

  console.log("📤 Sending PreApproval Payload:", requestBody);

  try {
    const response = await axios.post(LEAD_API, requestBody, {
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
    });

    console.log(
      `🚀 Lead sent successfully for PAN: ${lead.pan}`,
      response.data,
    );
    successCount++;
    return {
      status: "success",
      data: response.data,
    };
  } catch (error) {
    console.error(
      `❌ Failed to send lead for PAN: ${lead.pan}`,
      error.response?.data || error.message,
    );
    return {
      status: "failure",
      message: error.response?.data?.message || error.message,
    };
  }
}

function isValidPAN(pan) {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
}

async function processBatch(leads, token) {
  const promises = leads.map(async (lead) => {
    try {
      // Ensure PAN is uppercase for consistency before validation and API calls
      lead.pan = lead.pan ? lead.pan.toUpperCase() : lead.pan;

      if (!lead.phone || !lead.name || !lead.dob || !lead.pan) {
        console.error(`❌ Incomplete data for lead: ${lead.phone}. Skipping.`);
        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedMoneyView",
                reason: "Incomplete data (missing phone/Name/DOB/PAN)",
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      if (!isValidPAN(lead.pan)) {
        console.error(
          `❌ Invalid PAN format for lead: ${lead.phone} with PAN: ${lead.pan}`,
        );
        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedMoneyView",
                reason: `Invalid PAN format: ${lead.pan}`,
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      const userDoc = await UserDB.findOne({ phone: lead.phone });
      if (userDoc?.RefArr?.some((ref) => ref.name === "MoneyView")) {
        console.log(`⛔ Lead already processed for MoneyView: ${lead.phone}`);
        return;
      }

      // --- Start: Data Structure Normalization ---
      // This block ensures apiResponse and preApproval are arrays
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
      // --- End: Data Structure Normalization ---

      const dedupeResult = await dedupeCheck(lead.pan, token);
      console.log("✅ Dedupe Check Result:", dedupeResult);

      if (
        dedupeResult.status === "success" &&
        dedupeResult.message === "Lead already exists"
      ) {
        console.log(
          `⛔ Lead already exists in MoneyView for PAN: ${lead.pan}. Skipping lead submission.`,
        );
        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              apiResponse: {
                moneyView: dedupeResult,
                status: "skipped",
                message: "Lead already exists in MoneyView",
                createdAt: new Date().toISOString(),
              },
              RefArr: {
                name: "MoneyView",
                createdAt: new Date().toISOString(),
              },
            },
            $unset: { accounts: "" }, // Unset accounts field as per original code
          },
        );
        return;
      }

      const moneyViewResponse = await sendToMoneyView(lead, token);
      console.log("✅ MoneyView Lead Submission Response:", moneyViewResponse);

      const updateDoc = {
        $push: {
          apiResponse: {
            moneyView: moneyViewResponse,
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: "MoneyView",
            createdAt: new Date().toISOString(),
          },
        },
        $unset: { accounts: "" }, // Unset accounts field as per original code
      };

      const result = await UserDB.updateOne({ phone: lead.phone }, updateDoc);
      console.log("🧾 Saved API response to DB:", result);

      if (moneyViewResponse.status === "success") {
        successCount++;
        console.log("✅ Lead counted as success:", lead.phone);
      } else {
        console.log(
          `⛔ API failed for lead ${lead.phone}: ${moneyViewResponse.message}`,
        );
      }
    } catch (err) {
      console.error(`❌ Error processing lead ${lead.phone}:`, err.message);
      await UserDB.updateOne(
        { phone: lead.phone },
        {
          $push: {
            RefArr: {
              name: "SkippedMoneyView",
              reason: `Error during processing: ${err.message}`,
              createdAt: new Date().toISOString(),
            },
          },
        },
      );
    }
  });

  await Promise.allSettled(promises);
}

let totalLeads = 0;

async function Loop() {
  let token = null;
  try {
    token = await getToken();
    if (!token) {
      console.error("🚫 Could not obtain token. Exiting loop.");
      return;
    }

    while (true) {
      console.log("📦 Fetching new leads...");
      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $nin: ["MoneyView", "SkippedMoneyView"] },
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("✅ All new leads processed. No more data.");
        break;
      }

      console.log(`Processing batch of ${leads.length} leads.`);
      await processBatch(leads, token);
      totalLeads += leads.length;

      console.log(`📊 Total Leads Processed So Far: ${totalLeads}`);
      console.log(`🏁 Total Successful MoneyView Leads: ${successCount}`);

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error("❌ Loop error:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    console.log(`🏁 Final Total Successful MoneyView Leads: ${successCount}`);
    await mongoose.connection.close();
  }
}

Loop();
