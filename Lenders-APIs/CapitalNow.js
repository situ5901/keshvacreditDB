const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
const { SecurePartnerClient } = require("@capitalnow/secure-partner-sdk");

// ------------------- Credentials -------------------
const CAPNOW_USER = "keshvacredit_1001";
const CAPNOW_PASS = "pk_live_1S0rE5ozX9jGkhhrn1iTkCRlO";
const PARTNER_ID = "keshvacredit_1001";

// ------------------- API URLs -------------------
const BASE_URL = "https://partnerapi.capitalnow.in/api/v1/partner"; // Live
const LOGIN_API = `${BASE_URL}/login`;
const REFRESH_API = `${BASE_URL}/refresh-token`;
const DEDUPE_API = `${BASE_URL}/lead-dedupe-check`;

// ------------------- SDK & Keys -------------------
const client = new SecurePartnerClient({ keyDir: "./Loop-Helper/privateKey" });
const partnerPublicKey = fs.readFileSync(
  "./Loop-Helper/privateKey/partner_public.pem",
  "utf8",
);

let accessToken = null;
let refreshToken = null;

// ------------------- Helper Functions -------------------
async function loginPartner() {
  if (accessToken) return; // Don't login if token exists

  try {
    const authString = Buffer.from(`${CAPNOW_USER}:${CAPNOW_PASS}`).toString(
      "base64",
    );
    const loginRes = await axios.post(
      LOGIN_API,
      {},
      { headers: { Authorization: `Basic ${authString}` } },
    );
    const decrypted = client.decryptFromPartner(
      loginRes.data,
      partnerPublicKey,
    );
    accessToken = decrypted.data.access_token;
    refreshToken = decrypted.data.refresh_token;
    console.log("🔑 Access + Refresh token saved");
  } catch (err) {
    console.error("❌ Login Failed:", err.response?.data || err.message);
    throw new Error("Failed to authenticate with CapitalNow.");
  }
}

async function refreshAccessToken() {
  try {
    const authString = Buffer.from(`${CAPNOW_USER}:${CAPNOW_PASS}`).toString(
      "base64",
    );
    const res = await axios.post(
      REFRESH_API,
      {},
      {
        headers: {
          Authorization: `Basic ${authString}`,
          refresh_token: `Bearer ${refreshToken}`,
        },
      },
    );
    const decrypted = client.decryptFromPartner(res.data, partnerPublicKey);
    accessToken = decrypted.data.access_token;
    console.log("🔄 Access Token refreshed");
  } catch (err) {
    console.warn("⚠️ Refresh Failed. Logging in again...");
    accessToken = null;
    await loginPartner();
  }
}

async function getHeader() {
  if (!accessToken) await loginPartner();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

function buildPayload(user) {
  const [fname, ...lnameParts] = (user.name || "").trim().split(" ");
  return {
    first_name: fname || "",
    last_name: user.last_name || lnameParts.join(" ") || "",
    mobile_number: Number(user.phone),
    pan_number: user.pancard,
  };
}

async function sendToCapitalNow(user) {
  try {
    const encryptedPayload = client.encryptForPartner(
      PARTNER_ID,
      buildPayload(user),
      partnerPublicKey,
    );
    const response = await axios.post(DEDUPE_API, encryptedPayload, {
      headers: await getHeader(),
    });

    let finalData =
      response.data.partnerId === PARTNER_ID
        ? client.decryptFromPartner(response.data, partnerPublicKey)
        : response.data;

    if (finalData.code === 2005) finalData.url = "http://bit.ly/opencnapp";
    return finalData;
  } catch (err) {
    if (err.response?.status === 401 || err.response?.data?.code === 4118) {
      await refreshAccessToken();
      return sendToCapitalNow(user);
    }
    return { error: err.response?.data || err.message };
  }
}

// ------------------- API Route -------------------
router.post("/partner/capitalnow", async (req, res) => {
  try {
    const { phone, name, last_name, pancard } = req.body;
    if (!phone || !name || !pancard)
      return res
        .status(400)
        .json({ error: "phone, name, and pancard are required" });

    const user = { phone, name, last_name, pancard };
    const finalData = await sendToCapitalNow(user);
    res.json({ success: true, data: finalData });
  } catch (err) {
    console.error("❌ Route Error:", err.message);
    res.status(500).json({ error: "Failed to process CapitalNow request." });
  }
});

module.exports = router;
