const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();
const path = require("path");
const xlsx = require("xlsx");

const MONGODB_URINEW = process.env.MONGODB_URINEW;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "MVcollection",
  new mongoose.Schema({}, { collection: "MVcollection", strict: false }),
);

const Healthcheck_API = "https://atlas.whizdm.com/atlas/v1/health";
const TOKEN_API = "https://atlas.whizdm.com/atlas/v1/token";
const DEDUPE_API = "https://atlas.whizdm.com/atlas/v1/lead/dedupe";
const LEAD_API = "https://atlas.whizdm.com/atlas/v1/lead";
const OFFERS_API = "https://atlas.whizdm.com/atlas/v1/offers";
const JOURNEY_URL_API = "https://atlas.whizdm.com/atlas/v1/journey-url";
const PARTNER_CODE = 422;
const OFFER_LEADS = 15000;
const BATCH_SIZE = 25;
const PINCODE_FILE_PATH = path.join(__dirname, "..", "xlsx", "mv.xlsx");

//update code

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
//udpate co
let successCount = 0;
let noDedupeCount = 0;

async function getToken() {
  try {
    const healthCheck = await axios.get(Healthcheck_API);
    if (healthCheck.status === 200) {
      console.log("✅ Healthcheck API is up and running");
    } else {
      console.error("❌ Healthcheck API is not up and running");
    }

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

function isValidPAN(pan) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
}

async function dedupeCheck(lead, token) {
  let dedupeResponse = {
    status: "failure",
    message: "Unknown error during dedupe",
  };

  try {
    // ✅ Check for required fields
    if (!lead.pan || !lead.phone || !lead.email) {
      console.error("❌ Missing required fields in lead object:", {
        panNo: lead.pan,
        mobileNo: lead.phone,
        email: lead.email,
      });
      dedupeResponse.message = "Missing pan, phone, or email in lead object";
      return dedupeResponse;
    }

    const payload = {
      panNO: lead.pan,
      mobileNo: lead.phone,
      email: lead.email,
    };

    console.log(`\n🧾 [DEDUPE REQUEST] =>`, payload);

    // ❌ PROBLEM HERE: you're closing the `axios.post()` too early before the headers are set properly.
    const response = await axios.post(DEDUPE_API, payload, {
      headers: {
        token,
        "Content-Type": "application/json",
      }, // ✅ Remove comma here (or ensure it's closed correctly)
    });

    console.log(
      "✅ [DEDUPE RESPONSE] =>",
      JSON.stringify(response.data, null, 2),
      "\n",
    );

    // ✅ Check for specific response condition
    if (response.data.message === "No dedupe found") {
      noDedupeCount++;
      console.log(`⛔ No dedupe found for ${lead.pan} and ${lead.phone}`);
      if (noDedupeCount >= OFFER_LEADS) {
        console.log(`🎯 Reached ${OFFER_LEADS} successful offers. Stopping.`);
        throw new Error("🎯 Max successful offer count reached");
      }
    }

    // ✅ Update response structure
    dedupeResponse = {
      status: response.data.status,
      message: response.data.message,
      data: response.data,
    };
  } catch (error) {
    console.error(`❌ Dedupe Error:`, error.response?.data || error.message);
    dedupeResponse.message = error.response?.data?.message || error.message;
    dedupeResponse.data = error.response?.data || null;
  }

  return dedupeResponse;
}

async function fetchOffers(leadId, token, phone) {
  let offersResponse = {
    status: "failure",
    message: "Unknown error fetching offers",
  };
  try {
    console.log(
      `\n💰 [OFFERS REQUEST] Lead ID => ${leadId}, Phone => ${phone}`,
    );
    const response = await axios.get(`${OFFERS_API}/${leadId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(
      `[OFFERS RESPONSE for Phone ${phone}] =>`,
      JSON.stringify(response.data, null, 2),
      "\n",
    );

    offersResponse = { status: "success", data: response.data };
  } catch (error) {
    if (error.message === "🎯 Max successful offer count reached") {
      throw error;
    }
    console.error(
      `❌ Error fetching offers for Lead ID ${leadId}, Phone ${phone}:`,
      error.response?.data || error.message,
    );
    offersResponse.message = error.response?.data?.message || error.message;
    offersResponse.data = error.response?.data || null;
  }
  return offersResponse;
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
    employmentType: !lead.employment
      ? "Salaried"
      : lead.employment === "Self-employed"
        ? "Self Employed"
        : lead.employment,
    incomeMode: "online",
    declaredIncome: parseInt(lead.income),
    educationLevel: "GRADUATION",
    maritalStatus: "Married",
    addressList: [
      {
        addressLine1: "NA",
        pincode: lead.pincode,
        residenceType: "rented",
        addressType: "current",
        city: lead.city,
        state: lead.state,
      },
    ],
    emailList: [
      {
        email: lead.email,
        type: "primary_user",
      },
    ],
    loanPurpose: "Travel",
    consent: {
      consentDecision: true,
      deviceTimeStamp: new Date().toISOString(),
    },
    consentDetails: {
      consentDataList: [
        {
          productConsentType: "BUREAU_PULL",
          consentValue: "GIVEN",
          consentText: "I consent to bureau pull.",
        },
      ],
      deviceTimeStamp: new Date().toISOString(),
    },
  };

  console.log(
    "\n📤 [LEAD SUBMISSION REQUEST] =>",
    JSON.stringify(requestBody, null, 2),
  );

  let leadSubmissionResult = {
    status: "failure",
    message: "Lead not attempted",
  };
  let offersResult = {
    status: "skipped",
    message: "Lead submission failed/skipped",
  };
  let journeyUrlResult = {
    status: "skipped",
    message: "offers failed/skipped",
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
      offersResult = await fetchOffers(leadId, token, lead.phone);
      if (offersResult.status === "success" && offersResult.data) {
        journeyUrlResult = await fetchJourneyUrl(leadId, token);
      } else {
        console.warn("NO lead received");
      }
    } else {
      console.warn(
        "⚠️ No leadId received from lead submission. Skipping offers.",
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
      `❌ Submission failed for PAN: ${lead.pan}, Phone: ${lead.phone}`,
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

async function fetchJourneyUrl(leadId, token) {
  try {
    console.log(`🌐 [JOURNEY URL REQUEST] Lead ID => ${leadId}`);
    const response = await axios.get(`${JOURNEY_URL_API}/${leadId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(
      "[JOURNEY URL RESPONSE] =>",
      JSON.stringify(response.data, null, 2),
      "\n",
    );
    return { status: "success", data: response.data };
  } catch (error) {
    console.error(
      `❌ Error fetching Journey URL for Lead ID ${leadId}:`,
      error.response?.data || error.message,
    );
    return { status: "failure", message: error.message };
  }
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
        console.error(`❌ ${finalMessage}: ${lead.phone}`);
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
        console.log(`⛔ Lead already processed: ${lead.phone}`);
        return;
      }

      const dedupeResult = await dedupeCheck(lead, token);
      apiResponsesToSave.moneyViewDedupe = dedupeResult.data;

      if (
        dedupeResult.status === "success" &&
        dedupeResult.message === "Duplicate lead found in MV"
      ) {
        console.log(`⛔ Duplicate lead found in MV: ${lead.phone}`);
        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              apiResponse: {
                dedupe: apiResponsesToSave.moneyViewDedupe,
                status: "skipped",
                message: "Duplicate lead",
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
        finalMessage = moneyViewAllResponses.message || "API processing failed";
        console.log(`⛔ ${finalMessage} for ${lead.phone}`);
      }
    } catch (err) {
      console.error(`❌ Error processing: ${err.message} for ${lead.phone}`);
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
    if (noDedupeCount >= OFFER_LEADS) {
      console.log(`🎯 Reached ${OFFER_LEADS} successful offers. Stopping.`);
      break;
    }

    console.log("\n📦 Fetching next batch...");
    const leads = await UserDB.aggregate([
      {
        $match: { "RefArr.name": { $nin: ["MoneyView", "SkippedMoneyView"] } },
      },
      { $limit: BATCH_SIZE },
    ]);

    if (leads.length === 0) {
      console.log("✅ All leads processed.");
      break;
    }

    try {
      await processBatch(leads, token);
    } catch (err) {
      if (err.message === "🎯 Max successful offer count reached") {
        console.log(err.message);
        break;
      }
      console.error("❌ Error during batch processing:", err.message);
    }

    totalLeads += leads.length;

    console.log(
      `📊 Total Processed: ${totalLeads}, ✅ Successful Leads: ${successCount}, 🎯 No Dedupe Lead: ${noDedupeCount}`,
    );
  }

  console.log("🔌 Closing DB connection...");
  await mongoose.connection.close();
}

Loop();
