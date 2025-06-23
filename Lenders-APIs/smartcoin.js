require("dotenv").config();
const express = require("express");
const axios = require("axios");
const router = express.Router();

const Partner_id = "Keshvacredit";
const PRE_APPROVAL_API =
  "https://leads.smartcoin.co.in/partner/keshvacredit/lead/create";

function formatDOB(dob) {
  const date = new Date(dob);
  return date.toISOString().split("T")[0];
}

router.post("/smartcoin/lead", async (req, res) => {
  try {
    const { phone, pan, employment, income, dob, name } = req.body;

    const payload = new URLSearchParams({
      phone_number: String(phone),
      pan: pan,
      employment_type: employment,
      net_monthly_income: String(income || 0),
      name_as_per_pan: name,
      date_of_birth: formatDOB(dob),
      Partner_id: Partner_id,
    });

    const response = await axios.post(PRE_APPROVAL_API, payload.toString(), {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "admin-api-client-id": "sc_kvcd_oruwm5w5fxy4jnoi",
        "admin-api-client-key": "esy7kphmg6g9hu90",
      },
    });

    return res.status(200).json({
      response: response.data,
    });
  } catch (err) {
    const errMsg = err.response?.data || err.message;

    // ✅ Specific message for 403 error
    if (err.response?.status === 403) {
      return res.status(403).json({
        message:
          "❌ Your IP is not whitelisted by SmartCoin. Contact support to whitelist your server IP.",
      });
    }

    console.error("❌ SmartCoin Lead Error:", errMsg);

    return res.status(500).json({
      message: response.data.message,
      error: errMsg,
    });
  }
});

module.exports = router;
