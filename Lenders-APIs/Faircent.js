const express = require("express");
const router = express.Router();
const axios = require("axios");
const UserDB = require("../routes/BL/BLSchema");
const multer = require("multer");
const FormData = require("form-data");
const fs = require("fs");

// const FAIRCENT_BASE_URL = "https://fcnode5.faircent.com";
// const APP_ID = "b27b11e13af255ef90f7c1939dcab2d2";
// const APP_NAME = "KESHVACREDIT";

const BASE_URL = "https://api.faircent.com";
const APP_ID = "1cfa78742af22b054a57fac6cf830699";
const APP_NAME = "KESHVACREDIT";
// Faircent Lead Registration API
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

    // Correcting the API endpoint URL from `BASE_URL` to `FAIRCENT_BASE_URL`
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

// Multer storage configuration to save files locally
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync("./uploads")) {
      fs.mkdirSync("./uploads");
    }
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// API endpoint to proxy the document upload to Faircent
router.post(
  "/faircent/upload-doc-proxy",
  upload.single("docImage"),
  async (req, res) => {
    try {
      const { loan_id, type, access_token } = req.body;
      const filePath = req.file?.path;

      // Check if required fields are present
      if (!loan_id || !type || !filePath || !access_token) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: loan_id, type, access_token, or file.",
        });
      }

      // Create a new form-data object to send to the Faircent API
      const form = new FormData();
      form.append("loan_id", loan_id);
      form.append("type", type);
      form.append("docImage", fs.createReadStream(filePath)); // Attach the file from the local path

      // Make the API call to Faircent
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

      // Send the response from Faircent back to the user
      if (response.data?.success === true) {
        return res.status(200).json({
          success: true,
          message:
            response.data.message ||
            "Document uploaded successfully to Faircent.",
          data: response.data,
        });
      } else {
        return res.status(400).json({
          success: false,
          message:
            response.data.message || "❌ Document upload failed at Faircent.",
          data: response.data,
        });
      }
    } catch (err) {
      console.error(
        "❌ Faircent Upload Document Proxy API Error:",
        err.response?.data || err.message,
      );
      return res.status(500).json({
        success: false,
        message:
          err.response?.data?.message || err.message || "Internal Server Error",
        error: err.response?.data || err.message,
      });
    }
  },
);

module.exports = router;
