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

// ------------------ Upload Proxy API ------------------
router.post("/faircent/upload", upload.single("docImage"), async (req, res) => {
  try {
    // ------------------ Headers ------------------
    const headers = {
      "x-application-id": req.headers["x-application-id"] || APP_ID,
      "x-application-name": req.headers["x-application-name"] || APP_NAME,
      "x-access-token": req.headers["x-access-token"],
      // Remove Content-Type JSON because we'll use FormData
      // "Content-Type": "application/json",
    };

    const { type, loan_id } = req.body;
    if (!type || !loan_id) {
      return res.status(400).json({ success: false, message: "Missing type or loan_id" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "File 'docImage' is required" });
    }

    // ------------------ Convert to Base64 locally (optional) ------------------
    const base64String = req.file.buffer.toString("base64");
    console.log("Base64 length:", base64String.length); // optional log

    // ------------------ Prepare FormData for Faircent ------------------
    const FormData = require("form-data");
    const formData = new FormData();
    formData.append("type", type);
    formData.append("loan_id", loan_id);
    formData.append("docImage", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    console.log("Sending file to Faircent via FormData...");

    const response = await axios.post(
      `${BASE_URL}/v1/api/uploadprocess`,
      formData,
      {
        headers: { ...formData.getHeaders(), ...headers },
      }
    );

    console.log("✅ Faircent Upload Response:", response.data);

    // ------------------ Return response with Base64 included (optional) ------------------
    res.status(200).json({
      ...response.data,
      fileBase64: base64String, // optional: return Base64 string
    });
  } catch (err) {
    console.error("❌ Upload Error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.message,
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
