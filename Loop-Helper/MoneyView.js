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
  console.warn(
    "⚠️ No valid pincodes loaded. All leads with pincode checks will be skipped.",
  );
}

let successCount = 0;
let noDedupeCount = 0;

async function getToken() {
  try {
    const healthCheck = await axios.get(Healthcheck_API);
    if (healthCheck.status === 200) {
      console.log("✅ Healthcheck API is up and running");
    } else {
      console.error(
        "❌ Healthcheck API is not up and running (Status:",
        healthCheck.status,
        ")",
      );
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
      error.response?.data?.message || error.message,
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
    data: null, // Initialize data as null
  };

  try {
    // ✅ Check for required fields
    if (!lead.pan || !lead.phone || !lead.email) {
      console.error("❌ Missing required fields in lead object for dedupe:", {
        panNo: lead.pan,
        mobileNo: lead.phone,
        email: lead.email,
      });
      dedupeResponse.message = "Missing pan, phone, or email for dedupe";
      return dedupeResponse;
    }

    const payload = {
      panNO: lead.pan,
      mobileNo: lead.phone,
      email: lead.email,
    };

    console.log(`\n🧾 [DEDUPE REQUEST] =>`, payload);

    const response = await axios.post(DEDUPE_API, payload, {
      headers: {
        token,
        "Content-Type": "application/json",
      },
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
    console.error(
      `❌ Dedupe Error for ${lead.phone}:`,
      error.response?.data || error.message,
    );
    dedupeResponse.message = error.response?.data?.message || error.message;
    dedupeResponse.data = error.response?.data || null;
  }

  return dedupeResponse;
}

async function fetchOffers(leadId, token, phone) {
  let offersResponse = {
    status: "failure",
    message: "Unknown error fetching offers",
    data: null, // Initialize data as null
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
    gender: lead.gender ? lead.gender.toLowerCase() : "male", // Default if gender is missing
    phone: String(lead.phone),
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
    educationLevel: "GRADUATION", // Default as per original code
    maritalStatus: "Married", // Default as per original code
    addressList: [
      {
        addressLine1: "NA",
        pincode: String(lead.pincode),
        residenceType: "rented", // Default as per original code
        addressType: "current",
        city: lead.city || "NA", // Default if city is missing
        state: lead.state || "NA", // Default if state is missing
      },
    ],
    emailList: [
      {
        email: lead.email,
        type: "primary_user",
      },
    ],
    loanPurpose: "Travel", // Default as per original code
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
    data: null,
  };
  let offersResult = {
    status: "skipped",
    message: "Lead submission failed/skipped",
    data: null,
  };
  let journeyUrlResult = {
    status: "skipped",
    message: "offers failed/skipped",
    data: null,
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
        console.warn(
          `⚠️ Offers not fetched for lead ${lead.phone}. Reason: ${offersResult.message}`,
        );
      }
    } else {
      console.warn(
        "⚠️ No leadId received from lead submission. Skipping offers and journey URL.",
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
  let journeyUrlResponse = {
    status: "failure",
    message: "Unknown error fetching journey URL",
    data: null,
  };
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
    journeyUrlResponse = { status: "success", data: response.data };
  } catch (error) {
    console.error(
      `❌ Error fetching Journey URL for Lead ID ${leadId}:`,
      error.response?.data || error.message,
    );
    journeyUrlResponse.message = error.response?.data?.message || error.message;
    journeyUrlResponse.data = error.response?.data || null;
  }
  return journeyUrlResponse;
}

async function processBatch(leads, token) {
  const promises = leads.map(async (lead) => {
    let apiResponsesToSave = {};
    let finalStatus = "failed";
    let finalMessage = "Processing initiated";

    try {
      // Ensure phone is a string
      lead.phone = String(lead.phone);

      // Trim and uppercase PAN, trim pincode
      lead.pan = lead.pan?.toUpperCase().trim();
      lead.pincode = String(lead.pincode).trim();

      if (
        !lead.phone ||
        !lead.name ||
        !lead.dob ||
        !lead.pan ||
        !lead.pincode ||
        !lead.email || // Email is required for dedupe
        !lead.income
      ) {
        finalMessage =
          "Incomplete data for lead (missing phone, name, dob, pan, pincode, email, or income)";
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
            $set: { "apiResponse.moneyViewSkippedReason": finalMessage }, // Store reason in apiResponse
          },
          { upsert: true }, // Create if not exists
        );
        return;
      }

      if (!isValidPAN(lead.pan)) {
        finalMessage = `Invalid PAN format: ${lead.pan}`;
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
            $set: { "apiResponse.moneyViewSkippedReason": finalMessage },
          },
          { upsert: true },
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
            $set: { "apiResponse.moneyViewSkippedReason": finalMessage },
          },
          { upsert: true },
        );
        return;
      }

      const userDoc = await UserDB.findOne({ phone: lead.phone });
      if (userDoc?.RefArr?.some((ref) => ref.name === "MoneyView")) {
        console.log(
          `⛔ Lead already processed successfully (MoneyView tag found): ${lead.phone}`,
        );
        return;
      }
      if (userDoc?.RefArr?.some((ref) => ref.name === "SkippedMoneyView")) {
        console.log(
          `⛔ Lead previously skipped (SkippedMoneyView tag found): ${lead.phone}`,
        );
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
                type: "moneyViewDedupe",
                data: apiResponsesToSave.moneyViewDedupe,
                status: "skipped",
                message: "Duplicate lead",
                createdAt: new Date().toISOString(),
              },
              RefArr: {
                name: "MoneyView", // Mark as MoneyView even if duplicate found
                createdAt: new Date().toISOString(),
              },
            },
            $unset: { accounts: "" }, // Unset the accounts field as per original logic
          },
          { upsert: true },
        );
        return;
      }
      // If dedupe was not successful and not "No dedupe found", then skip processing further
      if (
        dedupeResult.status === "failure" &&
        dedupeResult.message !== "No dedupe found"
      ) {
        finalMessage = `Dedupe check failed: ${dedupeResult.message}`;
        console.error(`❌ ${finalMessage} for ${lead.phone}`);
        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              apiResponse: {
                type: "moneyViewDedupe",
                data: apiResponsesToSave.moneyViewDedupe,
                status: "failure",
                message: finalMessage,
                createdAt: new Date().toISOString(),
              },
              RefArr: {
                name: "SkippedMoneyView",
                reason: finalMessage,
                createdAt: new Date().toISOString(),
              },
            },
            $unset: { accounts: "" },
          },
          { upsert: true },
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
        successCount++;
        console.log(`✅ ${finalMessage}: ${lead.phone}`);
      } else {
        finalStatus = "failure";
        finalMessage = moneyViewAllResponses.message || "API processing failed";
        console.log(`⛔ ${finalMessage} for ${lead.phone}`);
      }
    } catch (err) {
      console.error(`❌ Error processing lead ${lead.phone}: ${err.message}`);
      finalStatus = "error";
      finalMessage = `Script error: ${err.message}`;
      if (err.message === "🎯 Max successful offer count reached") {
        throw err; // Re-throw to stop the main loop
      }
    } finally {
      // Always update the document with the final status and API responses
      await UserDB.updateOne(
        { phone: lead.phone },
        {
          $push: {
            apiResponse: {
              type: "moneyViewFullProcess",
              dedupe: apiResponsesToSave.moneyViewDedupe,
              leadSubmission: apiResponsesToSave.moneyViewLeadSubmission,
              offers: apiResponsesToSave.moneyViewOffers,
              journeyUrl: apiResponsesToSave.moneyViewJourneyUrl,
              status: finalStatus,
              message: finalMessage,
              createdAt: new Date().toISOString(),
            },
            RefArr: {
              name:
                finalStatus === "success" ? "MoneyView" : "SkippedMoneyView",
              createdAt: new Date().toISOString(),
            },
          },
          $unset: { accounts: "" },
        },
        { upsert: true }, // Ensure the document exists or is created
      );
    }
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
      console.log(
        `🎯 Reached ${OFFER_LEADS} successful offers (no dedupe). Stopping.`,
      );
      break;
    }

    console.log("\n📦 Fetching next batch...");
    const leads = await UserDB.aggregate([
      {
        $match: {
          $or: [
            { "RefArr.name": { $nin: ["MoneyView", "SkippedMoneyView"] } },
            { RefArr: { $exists: false } }, // Match if RefArr does not exist
            { RefArr: { $size: 0 } }, // Match if RefArr is an empty array
          ],
        },
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
      `📊 Total Processed (in batches): ${totalLeads}, ✅ Successfully Submitted to MV: ${successCount}, 🎯 No Dedupe Leads: ${noDedupeCount}`,
    );
  }
  console.log("🔌 Closing DB connection...");
  await mongoose.connection.close();
  console.log("✅ DB connection closed.");
}

Loop();
