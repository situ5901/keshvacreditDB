const axios = require("axios");
const mongoose = require("mongoose");
const fs = require("fs");
const { SecurePartnerClient } = require("@capitalnow/secure-partner-sdk");
require("dotenv").config(); // load .env file

// --- DB Connection ---
const MONGODB_URINEW = process.env.MONGODB_RSUnity;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);


// --- CapitalNow SDK & Keys ---
const client = new SecurePartnerClient({ keyDir: "./Loop-Helper/privateKey" });

const partnerPublicKey = fs.readFileSync(
  "./Loop-Helper/privateKey/partner_public.pem",
  "utf8",
);

const Partner_id = "keshvacredit_1001";

// --- API URLs ---
const BASE_URL = "https://partnerapi.capitalnow.in/api/v1/partner";
const LOGIN_API = `${BASE_URL}/login`;
const REFRESH_API = `${BASE_URL}/refresh-token`;
const DEDUPE_API = `${BASE_URL}/lead-dedupe-check`;

// --- Credentials ---
const CAPNOW_USER = "keshvacredit_1001";
const CAPNOW_PASS = "pk_live_1S0rE5ozX9jGkhhrn1iTkCRlO";

let accessToken = null;
let refreshToken = null;

// --- Partner Login ---
async function loginPartner() {
  try {
    const authString = Buffer.from(`${CAPNOW_USER}:${CAPNOW_PASS}`).toString(
      "base64",
    );

    const res = await axios.post(
      LOGIN_API,
      {},
      {
        headers: { Authorization: `Basic ${authString}` },
      },
    );

    console.log("📦 Login raw response:", res.data);

    const decryptedLogin = client.decryptFromPartner(
      res.data,
      partnerPublicKey,
    );
    console.log("✅ Decrypted Login Response:", decryptedLogin);

    accessToken = decryptedLogin.data.access_token;
    refreshToken = decryptedLogin.data.refresh_token;

    console.log("🔑 Access + Refresh token saved.");
  } catch (err) {
    console.error("❌ Login Failed:", err.response?.data || err.message);
    throw new Error("Failed to authenticate with CapitalNow.");
  }
}

// --- Refresh Access Token ---
async function refreshAccessToken() {
  try {
    const authString = Buffer.from(`${CAPNOW_USER}:${CAPNOW_PASS}`).toString(
      "base64",
    );

    const res = await axios.post(
      REFRESH_API,
      {}, // empty body
      {
        headers: {
          Authorization: `Basic ${authString}`,
          refresh_token: `Bearer ${refreshToken}`,
        },
      },
    );

    console.log("📦 Refresh raw response:", res.data);

    const decrypted = client.decryptFromPartner(res.data, partnerPublicKey);
    accessToken = decrypted.data.access_token;

    console.log("🔄 Access Token refreshed.");
  } catch (err) {
    console.error(
      "❌ Refresh Failed. Re-logging in...",
      err.response?.data || err.message,
    );
    await loginPartner();
  }
}

async function getHeader() {
  if (!accessToken) {
    await loginPartner();
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

function buildPayload(user) {
  const fullName = (user.name || "").trim();
  const [fname, ...lnameParts] = fullName.split(" ");
  let lastName = user.last_name || lnameParts.join(" ");

  if (!lastName || lastName.trim() === "") lastName = ".";

  return {
    first_name: fname || "User",
    last_name: lastName,
    mobile_number: Number(user.phone),
    pan_number: user.pan ? user.pan.toUpperCase() : "",
  };
}

async function sendToCapitalNow(user) {
  try {
    await loginPartner();

    const rawPayload = buildPayload(user);

    const encryptedPayload = client.encryptForPartner(
      Partner_id,
      rawPayload,
      partnerPublicKey
    );

    console.log(`📤 Encrypted payload for ${user.phone}:`, encryptedPayload);

    const response = await axios.post(DEDUPE_API, encryptedPayload, {
      headers: await getHeader(),
    });

    console.log(`📥 API Raw Response for ${user.phone}:`, response.data);

    let finalData;
    if (response.data.partnerId === Partner_id) {
      finalData = client.decryptFromPartner(response.data, partnerPublicKey);
    } else {
      finalData = response.data;
    }

    console.log(`✅ Decrypted Response for ${user.phone}:`, finalData);

    return finalData;

  } catch (err) {
    console.error(
      `❌ API Failed for ${user.phone}:`,
      err.response?.data || err.message
    );
    return {};
  }
}

// --- Process Batch of Users ---
async function processBatch(users) {
  for (const user of users) {
    const cnResponse = await sendToCapitalNow(user);

    let leadStatus = "PENDING";

    // Add app link to cnResponse if 2005
    if (cnResponse.code === 2004) {
      leadStatus = "REGISTERED_USER";
      console.log("👉 Registered User → Share app link: bit.ly/opencnapp");
    } else if (cnResponse.code === 2005) {
      leadStatus = "FRESH_LEAD";
      cnResponse.appLink = "bit.ly/opencnapp"; // ← Push link here
      console.log(
        "👉 Fresh Lead Registered → Share app link: bit.ly/opencnapp",
      );
    } else if (cnResponse.code === 2006) {
      leadStatus = "ACTIVE_LOAN";
      console.log("❌ Active Loan User → Reject lead.");
    }

    // Update DB
    await UserDB.updateOne(
      { _id: user._id },
      {
        $push: {
          apiResponse: {
            CapitalNow: cnResponse, // now includes appLink if 2005
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: "CapitalNow",
            response: cnResponse,
            createdAt: new Date().toISOString(),
          },
        },
        $set: {
          leadStatus,
        },
      },
    );

    console.log(`✅ DB updated (leadStatus=${leadStatus}) for ${user.phone}`);
  }
}

// --- Main Process Loop ---
async function processData() {
  let skip = 0;
  await loginPartner();

  while (true) {
    const users = await UserDB.find({
      $or: [
        { RefArr: { $exists: false } },
        { "RefArr.name": { $ne: "CapitalNow" } },
      ],
    })
      .skip(skip)
      .limit(1) // Process one user at a time
      .lean();

    if (!users.length) break;

    await processBatch(users);
    skip += users.length;
  }

  console.log("✅ All CapitalNow batches processed.");
  mongoose.disconnect();
}

// Start process
processData();
