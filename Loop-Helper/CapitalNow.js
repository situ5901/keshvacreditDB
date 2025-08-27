const axios = require("axios");
const mongoose = require("mongoose");
const fs = require("fs");
const { SecurePartnerClient } = require("@capitalnow/secure-partner-sdk");
require("dotenv").config(); // load .env file

const MONGODB_URINEW = process.env.MONGODB_URINEW;
mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "comp",
  new mongoose.Schema({}, { collection: "comp", strict: false }),
);

const client = new SecurePartnerClient({ keyDir: "./Loop-Helper/privateKey" });

const partnerPublicKey = fs.readFileSync(
  "./Loop-Helper/privateKey/partner_public.pem",
  "utf8",
);

const Partner_id = "keshvacredit_1001";

const BASE_URL = "https://partner-api.staging.capitalnow.in/api/v1/partner";
const LOGIN_API = `${BASE_URL}/login`;
const REFRESH_API = `${BASE_URL}/refresh-token`;
const DEDUPE_API = `${BASE_URL}/lead-dedupe-check`;

const CAPNOW_USER = "keshvacredit_1001";
const CAPNOW_PASS = "pk_test_BNvUulzyvKJq0kSDTOz";

let accessToken = null;
let refreshToken = null;

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
    console.log("📦 Logged in. AccessToken received", res.data);
    const decryptedLogin = client.decryptFromPartner(
      res.data,
      partnerPublicKey,
    );
    console.log("✅ Logged in. AccessToken received:", decryptedLogin);

    // FIX: Assign tokens from the decrypted object.
    accessToken = decryptedLogin.data.access_token;
    refreshToken = decryptedLogin.data.refresh_token;

    console.log("✅ Logged in with CapitalNow. Access token received.");
  } catch (err) {
    console.error("❌ Login Failed:", err.response?.data || err.message);
    throw new Error(
      "Failed to authenticate with CapitalNow. Please check your credentials.",
    );
  }
}

async function refreshAccessToken() {
  try {
    const res = await axios.post(REFRESH_API, { refreshToken });
    accessToken = res.data.accessToken;
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

// --- Data & API Logic ---
function buildPayload(user) {
  const [fname, ...lnameParts] = (user.name || "").trim().split(" ");
  return {
    first_name: fname || "",
    last_name: lnameParts.join(" ") || "",
    mobile_number: Number(user.phone),
    pan_number: user.pan,
  };
}

async function sendToCapitalNow(user) {
  try {
    const rawPayload = buildPayload(user);
    const encryptedPayload = client.encryptForPartner(
      Partner_id,
      rawPayload,
      partnerPublicKey,
    );
    console.log(`📦 Encrypted payload for ${user.phone}:`, encryptedPayload);

    const response = await axios.post(DEDUPE_API, encryptedPayload, {
      headers: await getHeader(),
    });

    console.log(`📥 API Raw Response for ${user.phone}:`, response.data);

    let finalData;

    if (response.data.partnerId === "keshvacredit_1001") {
      finalData = client.decryptFromPartner(response.data, partnerPublicKey);
    } else {
      finalData = response.data;
    }

    console.log(
      `✅ CapitalNow Decrypted Response for ${user.phone}:`,
      finalData,
    );

    return finalData;
  } catch (err) {
    if (err.response?.status === 401 || err.response?.data?.code === 4118) {
      console.warn("⚠️ Token expired or invalid. Refreshing...");
      await refreshAccessToken();
      return sendToCapitalNow(user);
    }
    console.error(
      `❌ API Failed for ${user.phone}:`,
      err.response?.data || err.message,
    );
    return {};
  }
}

// Processes a batch of users by sending them to the API and updating the DB.
async function processBatch(users) {
  for (const user of users) {
    const cnResponse = await sendToCapitalNow(user);

    await UserDB.updateOne(
      { _id: user._id },
      {
        $push: {
          apiResponse: {
            CapitalNow: cnResponse,
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: "CapitalNow",
            response: cnResponse,
            createdAt: new Date().toISOString(),
          },
        },
      },
    );

    console.log(`✅ DB updated (decrypted) for ${user.phone}`);
  }
}

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
      .limit(1) // Process one user at a time.
      .lean();

    if (!users.length) break;

    await processBatch(users);
    skip += users.length;
  }

  console.log("✅ All CapitalNow batches processed.");
  mongoose.disconnect();
}

// Start the process
processData();
