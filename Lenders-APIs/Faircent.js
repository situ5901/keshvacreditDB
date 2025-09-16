const express = require("express");
const router = express.Router();
const axios = require("axios");
const FormData = require("form-data");

const BASE_URL = "https://fcnode5.faircent.com/v1/api";
const APP_ID = "b27b11e13af255ef90f7c1939dcab2d2";
const APP_NAME = "KESHVACREDIT";

/**
 * STEP 1 & 2: Duplicate Check + Register User
 */
router.post("/faircent/lead", async (req, res) => {
  try {
    const { payload } = req.body;

    if (!payload) {
      return res.status(400).json({
        success: false,
        message: "Payload is required",
      });
    }

    // ⿡ Duplicate Check
    const dupRes = await axios.post(${BASE_URL}/duplicateCheck, payload, {
      headers: {
        "x-application-id": APP_ID,
        "x-application-name": APP_NAME,
        "Content-Type": "application/json",
      },
    });

    if (!dupRes.data.success) {
      return res.status(400).json({
        success: false,
        message: "Duplicate check failed",
        data: dupRes.data,
      });
    }

    // ⿢ Register User
    const regRes = await axios.post(
      ${BASE_URL}/aggregrator/register/user,
      payload,
      {
        headers: {
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
          "Content-Type": "application/json",
        },
      }
    );

    if (!regRes.data.success || regRes.data.result?.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Registration failed or not approved",
        data: regRes.data,
      });
    }

    // ✅ Success → Return token + loan_id for next step
    return res.status(200).json({
      success: true,
      message: "Duplicate check + Register successful",
      data: {
        loan_id: regRes.data.result.loan_id,
        token: regRes.data.result.token,
      },
    });
  } catch (err) {
    console.error("❌ Faircent Lead API Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.response?.data || err.message,
    });
  }
});

/**
 * STEP 3: File Upload API
 * This version expects file upload from frontend using FormData
 */
router.post("/faircent/upload", async (req, res) => {
  try {
    const { loan_id, type, token } = req.body;
    const file = req.files?.docImage; // if using express-fileupload or multer

    if (!loan_id || !type || !token || !file) {
      return res.status(400).json({
        success: false,
        message: "loan_id, type, token and file are required",
      });
    }

    const formData = new FormData();
    formData.append("type", type);
    formData.append("loan_id", loan_id);
    formData.append("docImage", file.data, file.name); 

    const uploadRes = await axios.post(${BASE_URL}/uploadprocess, formData, {
      headers: {
        "x-application-id": APP_ID,
        "x-application-name": APP_NAME,
        "x-access-token": token,
        ...formData.getHeaders(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: uploadRes.data,
    });
  } catch (err) {
    console.error("❌ Faircent Upload API Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
