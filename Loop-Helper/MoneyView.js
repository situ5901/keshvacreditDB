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

const HEALTH_CHECK_API = "https://growth-01.stg.whizdm.com/atlas/v1/health";
const TOKEN_API = "https://growth-01.stg.whizdm.com/atlas/v1/token";
const DEDUPE_API = "https://growth-01.stg.whizdm.com/atlas/v1/lead/filter/pan";
const LEAD_API = "https://growth-01.stg.whizdm.com/atlas/v1/lead";
const OFFERS_API = "https://growth-01.stg.whizdm.com/atlas/v1/offers";
const JOURNEY_URL_API = "https://growth-01.stg.whizdm.com/atlas/v1/journey-url";
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
      partnerCode: PARTNER_CODE, // Ensure PARTNER_CODE is defined
    };

    console.log(
      "\n🔐 [TOKEN REQUEST PAYLOAD] =>",
      JSON.stringify(tokenPayload, null, 2),
    );

    if (!PARTNER_CODE) {
      console.error("❌ PARTNER_CODE is undefined");
      return null;
    }

    try {
      const healthCheck = await axios.get(HEALTH_CHECK_API);
      console.log("✅ [HEALTH CHECK SUCCESS] =>", healthCheck.data);
    } catch (healthError) {
      console.error(
        "❌ [HEALTH CHECK FAILED] =>",
        healthError.response?.data || healthError.message,
      );
      return null;
    }

    // 3. Request token
    const response = await axios.post(TOKEN_API, tokenPayload);

    if (response?.data?.token) {
      console.log("✅ [TOKEN RECEIVED] =>", response.data.token, "\n");
      return response.data.token;
    } else {
      console.error("❌ [TOKEN RESPONSE MALFORMED] =>", response.data);
      return null;
    }
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
    partnerCode: 422,
    partnerRef: "keshvacredit",
    name: lead.name.trim(),
    gender: lead.gender.toLowerCase(),
    phone: lead.phone.toString(),
    pan: lead.pan.trim().toUpperCase(),
    dateOfBirth: lead.dob,
    bureauPermission: true,
    addressList: [
      {
        pincode: lead.pincode,
        residenceType: "rented",
        addressType: "current",
      },
    ],
    declaredIncome: parseInt(lead.income),
    employment: !lead.employment
      ? "Salaried"
      : lead.employment === "Self-employed"
        ? "Self Employed"
        : lead.employment,
    incomeMode: "online",
    emailList: [
      {
        email: lead.email,
        type: "primary_device",
      },
    ],
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
      console.log(`✅ Processed ${MAX_LEADS} leads. Exiting loop.`);
      break;
    }

    console.log("\n📦 Fetching next batch...");
    const leads = await UserDB.aggregate([
      {
        $match: {
          "RefArr.name": { $nin: ["MoneyView", "SkippedMoneyView"] },
        },
      },
      { $limit: BATCH_SIZE },
    ]);

    if (leads.length === 0) {
      console.log("✅ All leads processed.");
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
