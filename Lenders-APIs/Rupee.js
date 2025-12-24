const express = require("express");
const router = express.Router();
const axios = require("axios");
const { v4: uuidv4 } = require("uuid"); // uuid for lead id

const DEDUPE_API_URL =
  "https://api.rupee112fintech.com/marketing-check-dedupe/";
const PushAPI_URL = "https://api.rupee112fintech.com/marketing-push-data";
const Partner_id = "KESHVACREDIT_20250421";

const generate7DigitId = () => {
  const uuid = uuidv4();
  const digits = uuid.replace(/\D/g, "");
  return digits.slice(0, 7);
};

router.get("/testuser", async (req, res) => {
  res.send("Hello World");
});
//update situ
router.post("/partner/rupee/lead-create", async (req, res) => {
  try {
    const { name, phone, email, pan, pincode, employment, income, loanAmount } =
      req.query;

    const dedupePayload = {
      mobile: phone,
      pancard: pan,
      Partner_id,
    };

    const dedupeRes = await axios.post(DEDUPE_API_URL, dedupePayload, {
      headers: {
        Username: Partner_id,
        Auth: "a154c75adc5c96003c740668545c8ed59ff99f5ee520e8feb4b8087a41b2eb2a",
        "Content-Type": "application/json",
      },
    });

    if (dedupeRes.data?.status === false) {
      return res.status(409).json({
        success: false,
        message: "❌ Dedupe check failed: User already exists.",
        dedupeResponse: dedupeRes.data,
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "❌ Error occurred",
      error: err.message || err,
    });
  }
});

module.exports = router;
