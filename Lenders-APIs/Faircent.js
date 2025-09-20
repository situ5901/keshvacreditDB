const express = require("express");
const router = express.Router();
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
const fs = require("fs");

const FAIRCENT_BASE_URL = "https://fcnode5.faircent.com";
const APP_ID = "b27b11e13af255ef90f7c1939dcab2d2";
const APP_NAME = "KESHVACREDIT";

router.post("/faircent/lead", async (req, res) => {
  try {
    const { payload } = req.body;

    if (!payload) {
      return res.status(400).json({
        success: false,
        message: "Payload is required",
      });
    }

    const sign_ip = req.header("x-forwarded-for") || req.ip || "127.0.0.1";
    const sign_time = Math.floor(Date.now() / 1000);

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
      consent: "Y",
      tnc_link: "https://www.faircent.in/terms-conditions",
      sign_ip: sign_ip,
      sign_time: sign_time,
    };

    const response = await axios.post(
      `${FAIRCENT_BASE_URL}/v1/api/aggregrator/register/user`,
      faircentPayload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
        },
      },
    );

    if (response.data?.success === true) {
      return res.status(200).json({
        success: true,
        message: response.data.message || "✅ Lead created successfully",
        data: response.data,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: response.data.message || "❌ Lead creation failed",
        data: response.data,
      });
    }
  } catch (err) {
    console.error(
      "❌ Faircent Lead API Error:",
      err.response?.data || err.message,
    );
    return res.status(500).json({
      success: false,
      message:
        err.response?.data?.message || err.message || "Internal Server Error",
      error: err.response?.data || err.message,
    });
  }
});

// ----------------------------
// Multer Storage Config
// ----------------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads");
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// ----------------------------
// Multi-file Upload Route
// ----------------------------
const multiUpload = upload.fields([
  { name: "pancard", maxCount: 1 },
  { name: "aadhaar", maxCount: 1 },
  { name: "bank_statement", maxCount: 1 },
  { name: "business_registration_proof", maxCount: 1 },
]);

router.post("/upload/documents", multiUpload, async (req, res) => {
  try {
    const { loan_id, access_token } = req.body;

    if (!loan_id || !access_token) {
      return res.status(400).json({
        success: false,
        message: "loan_id and access_token are required",
      });
    }

    const docTypeMap = {
      pancard: "PANCARD",
      aadhaar: "AADHAAR",
      bank_statement: "BANK_STATEMENT",
      business_registration_proof: "BUSINESS_REGISTRATION_PROOF",
    };

    const results = [];

    for (let field in docTypeMap) {
      if (!req.files[field] || req.files[field].length === 0) continue;

      const filePath = req.files[field][0].path;
      const form = new FormData();
      form.append("type", docTypeMap[field]);
      form.append("docImage", fs.createReadStream(filePath));
      form.append("loan_id", loan_id);

      const response = await axios.post(
        `${FAIRCENT_BASE_URL}/v1/api/uploadprocess`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            "x-application-id": APP_ID,
            "x-application-name": APP_NAME,
            "x-access-token": access_token,
          },
        },
      );

      results.push({ field, response: response.data });

      // Delete temp file after upload
      fs.unlink(filePath, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error("Upload error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: "Upload failed",
      details: err.response?.data || err.message,
    });
  }
});

module.exports = router;
