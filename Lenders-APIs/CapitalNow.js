const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
const { SecurePartnerClient } = require("@capitalnow/secure-partner-sdk");

// ---------- CapitalNow Credentials ----------
const CAPNOW_USER = "keshvacredit_1001";
const CAPNOW_PASS = "pk_test_BNvUulzyvKJq0kSDTOz";
const Partner_id = "keshvacredit_1001";

// ---------- API URLs ----------
const BASE_URL = "https://partner-api.staging.capitalnow.in/api/v1/partner";
const LOGIN_API = `${BASE_URL}/login`;
const REFRESH_API = `${BASE_URL}/refresh-token`;
const DEDUPE_API = `${BASE_URL}/lead-dedupe-check`;

// ---------- Initialize CapitalNow SDK ----------
const client = new SecurePartnerClient({ keyDir: "./Loop-Helper/privateKey" });
const partnerPublicKey = fs.readFileSync(
  "./Loop-Helper/privateKey/partner_public.pem",
  "utf8",
);

// ---------- Helper: Login to CapitalNow ----------
async function loginPartner() {
  const authString = Buffer.from(`${CAPNOW_USER}:${CAPNOW_PASS}`).toString(
    "base64",
  );
  const loginRes = await axios.post(
    LOGIN_API,
    {},
    {
      headers: { Authorization: `Basic ${authString}` },
    },
  );
  const decryptedLogin = client.decryptFromPartner(
    loginRes.data,
    partnerPublicKey,
  );
  return {
    accessToken: decryptedLogin.data.access_token,
    refreshToken: decryptedLogin.data.refresh_token,
  };
}

// ---------- Helper: Refresh Access Token ----------
async function refreshAccessToken(refreshToken) {
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
  return { accessToken: decrypted.data.access_token };
}

// ---------- Helper: Get Authorization Header for a user ----------
async function getHeader() {
  const { accessToken } = await loginPartner(); // new token per user
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

// ---------- Helper: Build Payload ----------
function buildPayload(user) {
  const [fname, ...lnameParts] = (user.name || "").trim().split(" ");
  return {
    first_name: fname || "",
    last_name: user.last_name || lnameParts.join(" ") || "",
    mobile_number: Number(user.phone),
    pan_number: user.pancard,
  };
}

// ---------- Send user to CapitalNow ----------
async function sendToCapitalNow(user) {
  try {
    const rawPayload = buildPayload(user);
    const encryptedPayload = client.encryptForPartner(
      Partner_id,
      rawPayload,
      partnerPublicKey,
    );

    const response = await axios.post(DEDUPE_API, encryptedPayload, {
      headers: await getHeader(), // new token per call
    });

    const finalData =
      response.data.partnerId === Partner_id
        ? client.decryptFromPartner(response.data, partnerPublicKey)
        : response.data;

    if (finalData.code === 2005) {
      return { ...finalData, url: finalData.url || "http://bit.ly/opencnapp" };
    }

    return finalData;
  } catch (err) {
    console.error("❌ API Failed:", err.response?.data || err.message);
    return { error: err.response?.data || err.message };
  }
}

// ---------- API Route ----------
router.post("/partner/capitalnow", async (req, res) => {
  try {
    const { phone, name, last_name, pancard } = req.body;
    if (!phone || !name || !pancard) {
      return res
        .status(400)
        .json({ error: "phone, name, and pancard are required" });
    }

    const user = { phone, name, last_name, pancard };
    const finalData = await sendToCapitalNow(user);

    res.json({ success: true, data: finalData });
  } catch (err) {
    console.error("❌ Route Error:", err.message);
    res.status(500).json({ error: "Failed to process CapitalNow request." });
  }
});

module.exports = router;
