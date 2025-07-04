// ✅ Required Libraries and Setup
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
const BATCH_SIZE = 25;
const OFFER_LEADS = 15000;
const PINCODE_FILE_PATH = path.join(__dirname, "..", "xlsx", "mv.xlsx");

let successfulOffersCount = 0;
let successCount = 0;

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
    console.error("❌ Error loading pincodes:", error.message);
    return new Set();
  }
}

const validPincodesSet = loadValidPincodes(PINCODE_FILE_PATH);

async function getToken() {
  try {
    const health = await axios.get(Healthcheck_API);
    console.log("[HEALTHCHECK REQUEST] =>", Healthcheck_API);
    console.log("[HEALTHCHECK RESPONSE] =>", health.data);

    const payload = {
      userName: "keshvacredit",
      password: "Zb'91O(Nhy",
      partnerCode: PARTNER_CODE,
    };
    console.log("[TOKEN REQUEST] =>", payload);
    const response = await axios.post(TOKEN_API, payload);
    console.log("[TOKEN RESPONSE] =>", response.data);
    return response.data.token;
  } catch (err) {
    console.error("❌ Token Error:", err.message);
    return null;
  }
}

function isValidPAN(pan) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
}

async function fetchOffers(leadId, token, phone) {
  try {
    console.log(`[OFFERS REQUEST] => ${OFFERS_API}/${leadId}`);
    const response = await axios.get(`${OFFERS_API}/${leadId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`[OFFERS RESPONSE for ${phone}] =>`, response.data);
    if (
      response.data.status === "success" &&
      response.data.message === "success"
    ) {
      successfulOffersCount++;
      console.log(`🎯 Offers Success Count: ${successfulOffersCount}`);
      if (successfulOffersCount >= OFFER_LEADS) {
        throw new Error("🎯 Max offer count reached");
      }
    }
    return { status: "success", data: response.data };
  } catch (error) {
    console.log(
      "[OFFERS ERROR RESPONSE] =>",
      error.response?.data || error.message,
    );
    return {
      status: "failure",
      message: error.response?.data?.message || error.message,
    };
  }
}

async function fetchJourneyUrl(leadId, token) {
  try {
    console.log(`[JOURNEY URL REQUEST] => ${JOURNEY_URL_API}/${leadId}`);
    const response = await axios.get(`${JOURNEY_URL_API}/${leadId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("[JOURNEY URL RESPONSE] =>", response.data);
    return { status: "success", data: response.data };
  } catch (error) {
    console.log(
      "[JOURNEY URL ERROR RESPONSE] =>",
      error.response?.data || error.message,
    );
    return {
      status: "failure",
      message: error.response?.data?.message || error.message,
    };
  }
}

async function sendToMoneyView(lead, token) {
  const reqBody = {
    partnerCode: 422,
    partnerRef: "keshvacredit",
    name: lead.name.trim(),
    gender: lead.gender.toLowerCase(),
    phone: lead.phone.toString(),
    pan: lead.pan.trim().toUpperCase(),
    dateOfBirth: lead.dob,
    bureauPermission: true,
    employmentType:
      lead.employment === "Self-employed"
        ? "Self Employed"
        : lead.employment || "Salaried",
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

  console.log("[LEAD SUBMISSION REQUEST] =>", reqBody);
  const leadRes = await axios.post(LEAD_API, reqBody, {
    headers: { token, "Content-Type": "application/json" },
  });
  console.log("[LEAD SUBMISSION RESPONSE] =>", leadRes.data);

  const leadId = leadRes.data.leadId;
  let offers = { status: "skipped" };
  let journey = { status: "skipped" };
  if (leadId) {
    offers = await fetchOffers(leadId, token, lead.phone);
    if (offers.status === "success") {
      journey = await fetchJourneyUrl(leadId, token);
    }
  }
  return { leadId, offers, journey, reqBody };
}

async function processBatch(leads, token) {
  await Promise.allSettled(
    leads.map(async (lead) => {
      try {
        lead.pan = lead.pan?.toUpperCase().trim();
        lead.pincode = String(lead.pincode).trim();
        if (
          !lead.phone ||
          !lead.name ||
          !lead.dob ||
          !lead.pan ||
          !lead.pincode
        )
          return;
        if (!isValidPAN(lead.pan)) return;
        if (!validPincodesSet.has(lead.pincode)) return;

        const userDoc = await UserDB.findOne({ phone: lead.phone });
        if (userDoc?.RefArr?.some((ref) => ref.name === "MoneyView")) return;

        const response = await sendToMoneyView(lead, token);
        if (response.offers.status === "success") {
          successCount++;
        }

        await UserDB.updateOne(
          { phone: lead.phone },
          {
            $push: {
              RefArr: {
                name: "MoneyView",
                createdAt: new Date().toISOString(),
              },
              apiResponse: {
                dedupe: response.reqBody || {},
                leadRes: response.leadRes || {},
                offers: response.offers.data || {},
                journeyUrl: response.journey.data || {},
                createdAt: new Date().toISOString(),
              },
            },
            $unset: { accounts: "" },
          },
        );
      } catch (e) {
        console.error("❌ Error in processing lead:", lead.phone, e.message);
      }
    }),
  );
}

async function Loop() {
  const token = await getToken();
  if (!token) return;

  while (true) {
    if (successfulOffersCount >= MAX_OFFERS) {
      console.log("🎯 Reached 15 successful offers. Stopping loop.");
      break;
    }

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
      if (err.message === "🎯 Max offer count reached") break;
    }

    console.log(
      `✅ Leads Processed: ${successCount}, 🎯 Offers Success: ${successfulOffersCount}`,
    );
  }
  await mongoose.connection.close();
  console.log("🔌 MongoDB connection closed.");
}

Loop();
