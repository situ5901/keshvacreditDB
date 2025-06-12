const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();
const path = require("path");
const xlsx = require("xlsx"); // This will remain, but its usage is commented out.

const MONGODB_URINEW = process.env.MONGODB_URINEW;
mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err.message));

const UserDB = mongoose.model(
  "Test",
  new mongoose.Schema({}, { collection: "Test", strict: false }),
);

const TOKEN_API = "https://atlas.whizdm.com/atlas/v1/token";
const DEDUPE_API = "https://atlas.whizdm.com/atlas/v1/lead/dedupe";
const LEAD_API = "https://atlas.whizdm.com/atlas/v1/lead";
const OFFERS_API = "https://atlas.whizdm.com/atlas/v1/offers";
const JOURNEY_URL_API = "https://atlas.whizdm.com/atlas/v1/journey-url/";
const LEAD_STATUS_API = "https://atlas.whizdm.com/atlas/v1/lead/status/";
const FINAL_LOAN_DETAILS_API =
  "https://atlas.whizdm.com/atlas/v1/lead/final-loan-details/";

const PARTNER_CODE = 422;
const BATCH_SIZE = 1;
let successCount = 0;

async function ensureIndexes() {
  try {
    await UserDB.collection.createIndex({ "RefArr.name": 1 });
    console.log("✅ Index on RefArr.name ensured successfully.");
  } catch (error) {
    console.error("🚫 Error ensuring index on RefArr.name:", error.message);
  }
}

// 2. Token API
async function getToken() {
  try {
    const response = await axios.post(TOKEN_API, {
      userName: "keshvacredit",
      password: "Zb'91O(Nhy",
      partnerCode: PARTNER_CODE,
    });
    console.log("🔑 Token fetched successfully.");
    console.log(
      "🔑 Token API Full Response:",
      JSON.stringify(response.data, null, 2),
    ); // Print full response
    return response.data.token;
  } catch (error) {
    console.error(
      "❌ Error Fetching Token:",
      error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message,
    );
    return null;
  }
}

// 3. Dedupe API - Aligned with curl command
async function dedupeCheck(token, pan, email, phone) {
  console.log(`🔍 Performing Dedupe Check for PAN: ${pan}`);
  try {
    const response = await axios.post(
      DEDUPE_API,
      {
        panNo: pan,
        email: email,
        mobileNo: phone,
      },
      {
        headers: {
          "Content-Type": "application/json", // Explicitly set as in curl
          token: token,
          // 'Cookie': 'JSESSIONID=...', // Typically not set manually with axios for every call
        },
      },
    );
    console.log(
      "✅ Dedupe API Full Response:",
      JSON.stringify(response.data, null, 2),
    );
    return {
      status: response.data.status,
      message: response.data.message,
      duplicateFound: response.data.duplicateFound,
      dedupeStatus: response.data.dedupeStatus,
    };
  } catch (error) {
    console.error(
      `❌ Dedupe API Error for PAN ${pan}:`,
      error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message,
    );
    return {
      status: "failure",
      message: error.response?.data?.message || error.message,
      duplicateFound: false,
      dedupeStatus: "NOT_FOUND",
    };
  }
}

async function sendToMoneyView(lead, token) {
  const requestBody = {
    partnerCode: PARTNER_CODE,
    partnerRef: "keshvacredit",
    phone: lead.phone,
    pan: lead.pan.trim(),
    pincode: lead.pincode,
    name: lead.name.trim(),
    gender: lead.gender ? lead.gender.toLowerCase() : undefined,
    dateOfBirth: lead.dob,
    employmentType: lead.employment,
    declaredIncome: lead.income,
  };

  console.log("📤 Sending PreApproval Payload:", requestBody);

  try {
    const response = await axios.post(LEAD_API, requestBody, {
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
    });

    return {
      status: "success",
      data: response.data,
      leadId: response.data.leadId,
    };
  } catch (error) {
    console.error(
      `❌ Failed to send lead for PAN: ${lead.pan}:`, // Corrected line
      error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message,
    );
    return {
      status: "failure",
      message: error.response?.data?.message || error.message,
    };
  }
}

// 5. Get Offers API
async function getOffers(leadId, token) {
  console.log(`🎁 Fetching offers for Lead ID: ${leadId}`);
  try {
    const response = await axios.get(`${OFFERS_API}/${leadId}`, {
      headers: {
        token: token,
      },
    });
    console.log(
      `✅ Offers fetched successfully for Lead ID ${leadId}:`,
      JSON.stringify(response.data, null, 2),
    );
    return {
      status: "success",
      data: response.data,
    };
  } catch (error) {
    console.error(
      `❌ Error fetching offers for Lead ID ${leadId}:`,
      error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message,
    );
    return {
      status: "failure",
      message: error.response?.data?.message || error.message,
    };
  }
}

// 6. Get Journey URL API
async function getJourneyUrl(leadId, token) {
  console.log(`🔗 Fetching Journey URL for Lead ID: ${leadId}`);
  try {
    const response = await axios.get(`${JOURNEY_URL_API}${leadId}`, {
      headers: {
        token: token,
      },
    });
    console.log(
      `✅ Journey URL fetched successfully for Lead ID ${leadId}:`,
      JSON.stringify(response.data, null, 2),
    );
    return {
      status: "success",
      data: response.data,
    };
  } catch (error) {
    console.error(
      `❌ Error fetching Journey URL for Lead ID ${leadId}:`,
      error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message,
    );
    return {
      status: "failure",
      message: error.response?.data?.message || error.message,
    };
  }
}

// 7. Lead Status API
async function getLeadStatus(leadId, token) {
  console.log(`📊 Fetching status for Lead ID: ${leadId}`);
  try {
    const response = await axios.get(`${LEAD_STATUS_API}${leadId}`, {
      headers: {
        token: token,
      },
    });
    console.log(
      `✅ Lead status fetched successfully for Lead ID ${leadId}:`,
      JSON.stringify(response.data, null, 2),
    );
    return {
      status: "success",
      data: response.data,
    };
  } catch (error) {
    console.error(
      `❌ Error fetching lead status for Lead ID ${leadId}:`,
      error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message,
    );
    return {
      status: "failure",
      message: error.response?.data?.message || error.message,
    };
  }
}

// 8. Final Loan Details API
async function getFinalLoanDetails(leadId, token) {
  console.log(`💰 Fetching final loan details for Lead ID: ${leadId}`);
  try {
    const response = await axios.get(`${FINAL_LOAN_DETAILS_API}${leadId}`, {
      headers: {
        token: token,
      },
    });
    console.log(
      `✅ Final loan details fetched successfully for Lead ID ${leadId}:`,
      JSON.stringify(response.data, null, 2),
    );
    return {
      status: "success",
      data: response.data,
    };
  } catch (error) {
    console.error(
      `❌ Error fetching final loan details for Lead ID ${leadId}:`,
      error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message,
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

async function processSingleLead(lead, token) {
  try {
    lead.pan = lead.pan ? String(lead.pan).toUpperCase() : lead.pan;
    if (!lead.phone || !lead.name || !lead.dob || !lead.pan || !lead.pincode) {
      console.error(
        `❌ Incomplete essential data for lead: ${lead.phone}. Skipping.`,
      );
      await UserDB.updateOne(
        { phone: lead.phone },
        {
          $push: {
            RefArr: {
              name: "SkippedMoneyView",
              reason:
                "Incomplete essential data (missing phone/Name/DOB/PAN/Pincode)",
              createdAt: new Date().toISOString(),
            },
          },
        },
      );
      return;
    }

    if (!isValidPAN(lead.pan)) {
      console.error(
        `❌ Invalid PAN format for lead: ${lead.phone} with PAN: ${lead.pan}. Skipping.`,
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
    if (
      userDoc?.RefArr?.some(
        (ref) => ref.name === "MoneyView" || ref.name === "SkippedMoneyView",
      )
    ) {
      console.log(
        `⛔ Lead already processed or skipped for MoneyView: ${lead.phone}. Skipping duplicate.`,
      );
      return;
    }

    // Perform dedupe check
    const dedupeResult = await dedupeCheck(
      token,
      lead.pan,
      lead.email,
      lead.phone,
    );
    console.log("✅ Dedupe Check Result:", dedupeResult);

    if (
      dedupeResult.status === "success" &&
      (dedupeResult.duplicateFound || dedupeResult.dedupeStatus === "FOUND")
    ) {
      console.log(
        `⛔ Lead already exists in MoneyView for PAN: ${lead.pan}. Skipping lead submission.`,
      );
      await UserDB.updateOne(
        { phone: lead.phone },
        {
          $push: {
            apiResponse: {
              moneyView: {
                status: "skipped",
                message: "Lead already exists in MoneyView",
                dedupeStatus: dedupeResult.dedupeStatus,
              },
              createdAt: new Date().toISOString(),
            },
            RefArr: {
              name: "MoneyView",
              createdAt: new Date().toISOString(),
            },
          },
          $unset: { accounts: "" },
        },
      );
      return;
    }

    // Create lead
    const moneyViewResponse = await sendToMoneyView(lead, token);
    console.log("✅ MoneyView Lead Submission Response:", moneyViewResponse);

    const updateDoc = {
      $push: {
        apiResponse: {
          moneyView: moneyViewResponse,
          createdAt: new Date().toISOString(),
        },
      },
      $unset: { accounts: "" },
    };

    if (moneyViewResponse.status === "success" && moneyViewResponse.leadId) {
      successCount++;
      console.log("✅ Lead successfully submitted and counted:", lead.phone);

      const offersResult = await getOffers(moneyViewResponse.leadId, token);
      if (offersResult.status === "success") {
        updateDoc.$push.apiResponse.moneyView.offers = offersResult.data;
      } else {
        updateDoc.$push.apiResponse.moneyView.offers = {
          status: "failed",
          message: offersResult.message,
        };
      }

      // Get journey URL
      const journeyUrlResult = await getJourneyUrl(
        moneyViewResponse.leadId,
        token,
      );
      if (journeyUrlResult.status === "success") {
        updateDoc.$push.apiResponse.moneyView.journeyUrl =
          journeyUrlResult.data;
      } else {
        updateDoc.$push.apiResponse.moneyView.journeyUrl = {
          status: "failed",
          message: journeyUrlResult.message,
        };
      }

      // Get lead status
      const statusResult = await getLeadStatus(moneyViewResponse.leadId, token);
      if (statusResult.status === "success") {
        updateDoc.$push.apiResponse.moneyView.status = statusResult.data;
      }

      // Get final loan details
      const loanDetailsResult = await getFinalLoanDetails(
        moneyViewResponse.leadId,
        token,
      );
      if (loanDetailsResult.status === "success") {
        updateDoc.$push.apiResponse.moneyView.finalLoanDetails =
          loanDetailsResult.data;
      }

      updateDoc.$push.RefArr = {
        name: "MoneyView",
        createdAt: new Date().toISOString(),
      };
    } else {
      console.log(
        `⛔ MoneyView API failed for lead ${lead.phone}: ${moneyViewResponse.message}`,
      );
      updateDoc.$push.RefArr = {
        name: "SkippedMoneyView",
        reason: moneyViewResponse.message,
        createdAt: new Date().toISOString(),
      };
    }

    const result = await UserDB.updateOne({ phone: lead.phone }, updateDoc);
    console.log("🧾 Saved API response and status to DB:", result);
  } catch (err) {
    console.error(
      `❌ Unexpected error processing lead ${lead.phone}:`,
      err.message,
    );
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
}

let totalLeads = 0;

async function Loop() {
  let token = null;
  try {
    // Ensure indexes are set up before fetching leads
    await ensureIndexes();

    token = await getToken();
    if (!token) {
      console.error("🚫 Could not obtain token. Exiting loop.");
      return;
    }

    while (true) {
      console.log("\n📦 Fetching new leads...");
      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $nin: ["MoneyView", "SkippedMoneyView"] },
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("✅ All new leads processed. No more data to process.");
        break;
      }

      console.log(`Processing batch of ${leads.length} leads.`);
      await Promise.allSettled(
        leads.map((lead) => processSingleLead(lead, token)),
      );
      totalLeads += leads.length;
      console.log(`\n📊 Total Leads Processed So Far: ${totalLeads}`);
      console.log(`🏁 Total Successful MoneyView Leads: ${successCount}`);
    }
  } catch (error) {
    console.error("❌ Loop experienced an error:", error.message);
  } finally {
    console.log("\n🔌 Closing DB connection...");
    console.log(`🏁 Final Total Successful MoneyView Leads: ${successCount}`);
    await mongoose.connection.close();
  }
}
Loop();
