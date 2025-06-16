const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();
const path = require("path");
const xlsx = require("xlsx");

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

const TOKEN_API = "https://atlas.whizdm.com/atlas/v1/token";
const DEDUPE_API = "https://atlas.whizdm.com/atlas/v1/lead/filter/pan";
const LEAD_API = "https://atlas.whizdm.com/atlas/v1/lead";
const OFFERS_API = "https://atlas.whizdm.com/atlas/v1/offers";
const JOURNEY_URL_API = "https://atlas.whizdm.com/atlas/v1/journey-url";
const MAX_LEADS = 1000;
const PARTNER_CODE = 422;
const BATCH_SIZE = 1;
const PINCODE_FILE_PATH = path.join(__dirname, "..", "xlsx", "mv.xlsx");

function loadValidPincodes(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    const pins = data.map((row) => {
      let pin = row.pincode;
      if (typeof pin === "number") pin = pin.toString().padStart(6, "0");
      return String(pin).trim();
    });

    console.log(`✅ Loaded ${pins.length} valid pincodes from Excel`);
    return new Set(pins);
  } catch (error) {
    console.error("❌ Error loading valid pincodes:", error.message);
    return new Set();
  }
}

const validPincodesSet = loadValidPincodes(PINCODE_FILE_PATH);
if (validPincodesSet.size === 0) {
  console.warn("⚠️ No valid pincodes loaded. Skipping all leads.");
}

let successCount = 0;

async function getToken() {
  try {
    const tokenPayload = {
      userName: "keshvacredit",
      password: "Zb'91O(Nhy",
      partnerCode: PARTNER_CODE,
    };
    console.log(
      "\n🔐 [TOKEN REQUEST] =>",
      JSON.stringify(tokenPayload, null, 2),
    );
    const response = await axios.post(TOKEN_API, tokenPayload);
    console.log("✅ [TOKEN RESPONSE] =>", response.data.token, "\n");
    return response.data.token;
  } catch (error) {
    console.error(
      "❌ Error fetching token:",
      error.response?.data || error.message,
    );
    return null;
  }
}

async function dedupeCheck(pan, token) {
  let dedupeResponse = {
    status: "failure",
    message: "Unknown error during dedupe",
  };
  try {
    console.log(`\n🧾 [DEDUPE REQUEST] PAN => ${pan}`);
    const response = await axios.get(`${DEDUPE_API}/${pan}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(
      "[DEDUPE RESPONSE] =>",
      JSON.stringify(response.data, null, 2),
      "\n",
    );
    dedupeResponse = {
      status: response.data.status,
      message: response.data.message,
      data: response.data,
    };
  } catch (error) {
    console.error(
      `❌ Dedupe Error for PAN ${pan}:`,
      error.response?.data || error.message,
    );
    dedupeResponse.message = error.response?.data?.message || error.message;
    dedupeResponse.data = error.response?.data || null;
  }
  return dedupeResponse;
}

async function fetchOffers(leadId, token) {
  let offersResponse = {
    status: "failure",
    message: "Unknown error fetching offers",
  };
  try {
    console.log(`\n💰 [OFFERS REQUEST] Lead ID => ${leadId}`);
    const response = await axios.get(`${OFFERS_API}/${leadId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(
      "[OFFERS RESPONSE] =>",
      JSON.stringify(response.data, null, 2),
      "\n",
    );
    offersResponse = { status: "success", data: response.data };
  } catch (error) {
    console.error(
      `❌ Error fetching offers for Lead ID ${leadId}:`,
      error.response?.data || error.message,
    );
    offersResponse.message = error.response?.data?.message || error.message;
    offersResponse.data = error.response?.data || null;
  }
  return offersResponse;
}

async function fetchJourneyUrl(leadId, token) {
  let journeyUrlResponse = {
    status: "failure",
    message: "Unknown error fetching journey URL",
  };
  try {
    console.log(`\n🔗 [JOURNEY URL REQUEST] Lead ID => ${leadId}`);
    const response = await axios.get(`${JOURNEY_URL_API}/${leadId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(
      "[JOURNEY URL RESPONSE] =>",
      JSON.stringify(response.data, null, 2),
      "\n",
    );
    journeyUrlResponse = { status: "success", data: response.data };
  } catch (error) {
    console.error(
      `❌ Error fetching journey URL for Lead ID ${leadId}:`,
      error.response?.data || error.message,
    );
    journeyUrlResponse.message = error.response?.data?.message || error.message;
    journeyUrlResponse.data = error.response?.data || null;
  }
  return journeyUrlResponse;
}

async function sendToMoneyView(lead, token) {
  const requestBody = {
    partnerCode: PARTNER_CODE,
    partnerRef: "keshvacredit",
    phone: lead.phone,
    pan: lead.pan.trim(),
    name: lead.name.trim(),
    gender: lead.gender.toLowerCase(),
    dateofbirth: lead.dob,
    pincode: lead.pincode,
    employmenttype: lead.employment,
    declaredincome: lead.income,

    bureauPermission: true,
    incomeMode: "online",
    educationLevel: "GRADUATION",
    addressList: [
      {
        addressLine1: "123 Main Street",
        addressLine2: "Landmark Building",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        addressType: "current",
        residenceType: "owned",
      },
    ],
    motherName: "Suman Sharma",
    fatherName: "Vikram Sharma",
    employerName: "TCS",
    loanPurpose: "Home Renovation",
    alternatePhone: "9988776655",
    maritalStatus: "Married",
    yearsOfExperience: 5,
    annualFamilyIncome: "800000",
    consent: {
      consentDecision: true,
      deviceTimeStamp: "2025-06-16T10:15:30.000Z",
      metaData: {
        latitude: "19.0760",
        longitude: "72.8777",
        deviceIpAddress: "192.168.1.10",
      },
    },
    consentDetails: {
      deviceTimeStamp: "2025-06-16T10:15:30.000Z",
      metadata: {
        latitude: "19.0760",
        longitude: "72.8777",
        deviceIpAddress: "192.168.1.10",
      },
      consentDataList: [
        {
          productConsentType: "BUREAU_PULL",
          consentValue: "GIVEN",
          consentText: "User consented to bureau pull.",
          consentID: "CP001",
        },
        {
          productConsentType: "WHATSAPP_CONSENT",
          consentValue: "GIVEN",
          consentText: "User consented to receive updates on WhatsApp.",
          consentID: "CP002",
        },
      ],
    },
  };

  console.log(
    "\n📤 [LEAD SUBMISSION REQUEST] =>",
    JSON.stringify(requestBody, null, 2),
  );

  let leadSubmissionResult = {
    status: "failure",
    message: "Lead submission not attempted",
  };
  let offersResult = {
    status: "skipped",
    message: "Lead submission failed or skipped",
  };
  let journeyUrlResult = {
    status: "skipped",
    message: "Lead submission or offers failed/skipped",
  };

  try {
    const response = await axios.post(LEAD_API, requestBody, {
      headers: { "Content-Type": "application/json", token },
    });
    console.log(
      "📥 [LEAD SUBMISSION RESPONSE] =>",
      JSON.stringify(response.data, null, 2),
      "\n",
    );
    leadSubmissionResult = { status: "success", data: response.data };

    const leadId = response.data.leadId;
    if (leadId) {
      offersResult = await fetchOffers(leadId, token);
      if (offersResult.status === "success" && offersResult.data) {
        journeyUrlResult = await fetchJourneyUrl(leadId, token);
      } else {
        console.warn(
          "⚠️ Offers API call failed or returned no data. Skipping Journey URL API call.",
        );
      }
    } else {
      console.warn(
        "⚠️ No leadId received from lead submission. Skipping offers and Journey URL API calls.",
      );
    }

    return {
      status: "success",
      leadSubmission: leadSubmissionResult,
      offers: offersResult,
      journeyUrl: journeyUrlResult,
    };
  } catch (error) {
    console.error(
      `❌ Submission failed for PAN: ${lead.pan}`,
      error.response?.data || error.message,
    );
    leadSubmissionResult = {
      status: "failure",
      message: error.response?.data?.message || error.message,
      data: error.response?.data || null,
    };
    return {
      status: "failure",
      message: error.response?.data?.message || error.message,
      leadSubmission: leadSubmissionResult,
      offers: offersResult,
      journeyUrl: journeyUrlResult,
    };
  }
}

function isValidPAN(pan) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
}

async function processBatch(leads, token) {
  const promises = leads.map(async (lead) => {
    let apiResponsesToSave = {};
    let finalStatus = "failed";
    let finalMessage = "Processing initiated";

    try {
      lead.pan = lead.pan?.toUpperCase().trim();
      lead.pincode = String(lead.pincode).trim();

      if (
        !lead.phone ||
        !lead.name ||
        !lead.dob ||
        !lead.pan ||
        !lead.pincode
      ) {
        finalMessage = "Incomplete data for lead";
        console.error(`❌ ${finalMessage}: ${lead.phone}. Skipping.`);
        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedMoneyView",
                reason: finalMessage,
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      if (!isValidPAN(lead.pan)) {
        finalMessage = `Invalid PAN format: ${lead.pan}`;
        console.error(`❌ ${finalMessage}`);
        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedMoneyView",
                reason: finalMessage,
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      if (!validPincodesSet.has(lead.pincode)) {
        finalMessage = `Invalid Pincode: ${lead.pincode}`;
        console.error(`❌ ${finalMessage} for phone: ${lead.phone}`);
        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedMoneyView",
                reason: finalMessage,
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
        return;
      }

      const userDoc = await UserDB.findOne({ phone: lead.phone });
      if (userDoc?.RefArr?.some((ref) => ref.name === "MoneyView")) {
        finalMessage = "Lead already processed";
        console.log(`⛔ ${finalMessage}: ${lead.phone}`);
        return;
      }

      const dedupeResult = await dedupeCheck(lead.pan, token);
      apiResponsesToSave.moneyViewDedupe = dedupeResult.data;

      if (
        dedupeResult.status === "success" &&
        dedupeResult.message === "Duplicate lead found in MV"
      ) {
        finalStatus = "skipped";
        finalMessage = "Duplicate lead found in MV (dedupe)";
        console.log(
          `⛔ ${finalMessage} for ${lead.phone}. Skipping lead submission, offers, and journey URL.`,
        );
        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              apiResponse: {
                dedupe: apiResponsesToSave.moneyViewDedupe,
                status: finalStatus,
                message: finalMessage,
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

      const moneyViewAllResponses = await sendToMoneyView(lead, token);

      apiResponsesToSave.moneyViewLeadSubmission =
        moneyViewAllResponses.leadSubmission.data;
      apiResponsesToSave.moneyViewOffers = moneyViewAllResponses.offers.data;
      apiResponsesToSave.moneyViewJourneyUrl =
        moneyViewAllResponses.journeyUrl.data;

      if (moneyViewAllResponses.status === "success") {
        finalStatus = "success";
        finalMessage = "Lead processed successfully";
        successCount++;
        console.log(`✅ ${finalMessage}: ${lead.phone}`);
      } else {
        finalStatus = "failed";
        finalMessage = moneyViewAllResponses.message || "API processing failed";
        console.log(`⛔ ${finalMessage} for ${lead.phone}`);
      }
    } catch (err) {
      finalStatus = "failed";
      finalMessage = `Error during processing: ${err.message}`;
      console.error(`❌ ${finalMessage} for ${lead.phone}`);
      await UserDB.updateOne(
        { phone: lead.phone },
        {
          $push: {
            RefArr: {
              name: "SkippedMoneyView",
              reason: finalMessage,
              createdAt: new Date().toISOString(),
            },
          },
        },
      );
      return;
    }

    await UserDB.updateOne(
      { phone: lead.phone },
      {
        $push: {
          apiResponse: {
            ...apiResponsesToSave,
            createdAt: new Date().toISOString(),
          },
          RefArr: { name: "MoneyView", createdAt: new Date().toISOString() },
        },
        $unset: { accounts: "" },
      },
    );
  });

  await Promise.allSettled(promises);
}

let totalLeads = 0;

async function Loop() {
  let token = await getToken();
  if (!token) {
    console.error("❌ No token. Exiting.");
    return;
  }

  while (true) {
    if (totalLeads >= MAX_LEADS) {
      console.log(`✅ Reached max limit of ${MAX_LEADS} leads. Stopping.`);
      break;
    }

    console.log("\n📦 Fetching next batch...");
    const remainingLimit = MAX_LEADS - totalLeads;
    const leads = await UserDB.aggregate([
      {
        $match: {
          "RefArr.name": { $nin: ["MoneyView", "SkippedMoneyView"] },
        },
      },
      { $limit: Math.min(BATCH_SIZE, remainingLimit) },
    ]);

    if (leads.length === 0) {
      console.log("✅ All leads processed or no remaining unprocessed leads.");
      break;
    }

    await processBatch(leads, token);
    totalLeads += leads.length;
    console.log(
      `📊 Total Processed: ${totalLeads}, ✅ Successful: ${successCount}`,
    );
  }

  console.log("🔌 Closing DB connection...");
  await mongoose.connection.close();
}

Loop();
