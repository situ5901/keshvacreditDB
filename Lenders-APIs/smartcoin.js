const express = require("express");
const axios = require("axios");
const router = express.Router();
const { saveApiResponse } = require("../utils/saveApiResponse"); // import the helper

const Partner_id = "Keshvacredit";
const PRE_APPROVAL_API = "https://leads.smartcoin.co.in/partner/keshvacredit/lead/create";

function formatDOB(dob) {
  if (!dob) return null;
  try {
    const date = new Date(dob);
    return date.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

router.post("/smartcoin/lead", async (req, res) => {
  const { phone, pan, employment, income, dob, name } = req.body;

  try {
    const payload = new URLSearchParams({
      phone_number: String(phone),
      pan,
      employment_type: employment,
      net_monthly_income: String(income || 0),
      name_as_per_pan: name,
      date_of_birth: formatDOB(dob),
      Partner_id,
    });

    const response = await axios.post(PRE_APPROVAL_API, payload.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "admin-api-client-id": "SC_KVCD_oruwm5w5fXy4JNoi",
        "admin-api-client-key": "esy7kphMG6G9hu90",
      },
    });

    // ✅ Save API response
    await saveApiResponse(phone, "SmartCoin", response.data, "success");

    return res.status(200).json({
      success: true,
      response: response.data,
    });
  } catch (err) {
    const errMsg = err.response?.data || err.message;

    // Save failure response
    await saveApiResponse(phone, "SmartCoin", errMsg, "failure", "API call failed");

    if (err.response?.status === 403) {
      return res.status(403).json({
        success: false,
        message:
          "❌ Your IP is not whitelisted by SmartCoin. Contact support to whitelist your server IP.",
      });
    }

    console.error("❌ SmartCoin Lead Error:", errMsg);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: errMsg,
    });
  }
});

module.exports = router;