const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require('fs');
const axios = require("axios");
const FormData = require("form-data");

// ✅ UAT
const BASE_URL = "https://fcnode5.faircent.com";
const APP_ID = "b27b11e13af255ef90f7c1939dcab2d2";
const APP_NAME = "KESHVACREDIT";

// const BASE_URL = "https://api.faircent.com";
// const APP_ID = "1cfa78742af22b054a57fac6cf830699";
// const APP_NAME = "KESHVACREDIT";
const UPLOAD_ENDPOINT = '/v1/api/uploadprocess';

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

// ------------------ Upload API ------------------
router.post("/faircent/upload", upload.single("docImage"), async (req, res) => {
  try {
    console.log("🔹 Upload API request received");

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload file!" });
    }
    
    // Extract form data from the request body
    const { loan_id, type } = req.body;
    // Get access token from request headers
    const accessToken = req.headers['x-access-token'];

    // Validate required fields
    if (!loan_id) {
      return res.status(400).json({ success: false, message: "loan_id value Required" });
    }
    if (!type) {
      return res.status(400).json({ success: false, message: "type value Required" });
    }
    if (!accessToken) {
      return res.status(400).json({ success: false, message: "x-access-token header is missing." });
    }

    // Create a new FormData instance
    const formData = new FormData();
    formData.append('loan_id', loan_id);
    formData.append('type', type);
    // append the file buffer and filename to the form data
    formData.append('docImage', req.file.buffer, req.file.originalname);

    const headers = {
      ...formData.getHeaders(), // Important for multipart/form-data
      'x-application-id': APP_ID,
      'x-application-name': APP_NAME,
      'x-access-token': accessToken
    };

    const url = `${BASE_URL}${UPLOAD_ENDPOINT}`;

    const response = await axios.post(url, formData, { headers });

    console.log("✅ Upload API Response:", response.data);

    return res.status(200).json(response.data);

  } catch (err) {
    console.error("❌ Upload API Error:", err.response?.data || err.message);
    const errorResponse = err.response?.data || { success: false, message: err.message };
    return res.status(err.response?.status || 500).json(errorResponse);
  }
});

module.exports = router;
