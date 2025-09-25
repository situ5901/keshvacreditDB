const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

// ✅ UAT
// const BASE_URL = "https://fcnode5.faircent.com";
// const APP_ID = "b27b11e13af255ef90f7c1939dcab2d2";
// const APP_NAME = "KESHVACREDIT";

const BASE_URL = "https://api.faircent.com";
const APP_ID = "1cfa78742af22b054a57fac6cf830699";
const APP_NAME = "KESHVACREDIT";

// Multer memory storage (RAM only, no disk)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ------------------ Lead API ------------------
router.post("/faircent/lead", async (req, res) => {
  try {
    console.log("🔹 Lead API request received");
    const { payload } = req.body;

    if (!payload) {
      return res
        .status(400)
        .json({ success: false, message: "Payload is required" });
    }

    const faircentPayload = {
      fname: payload.fname,
      lname: payload.lname,
      dob: payload.dob,
      pan: payload.pan,
      mobile: payload.mobile,
      pin: payload.pin,
      state: payload.state,
      city: payload.city,
      address: payload.address,
      mail: payload.mail,
      gender: payload.gender,
      employment_status: payload.employment_status,
      loan_purpose: payload.loan_purpose,
      loan_amount: payload.loan_amount,
      monthly_income: payload.monthly_income,
    };

    const response = await axios.post(
      `${BASE_URL}/v1/api/aggregrator/register/user`,
      faircentPayload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
        },
      },
    );

    console.log("✅ Lead API Response:", response.data);

    return res.status(response.data?.success ? 200 : 400).json({
      success: response.data?.success || false,
      message: response.data.message,
      data: response.data,
    });
  } catch (err) {
    console.error("❌ Lead API Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.message,
      error: err.response?.data || err.message,
    });
  }
});

router.post("/faircent/upload", upload.single("docImage"), async (req, res) => {
  console.log("🔹 Faircent Upload API request received");
});

module.exports = router;
