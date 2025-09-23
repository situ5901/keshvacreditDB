const express = require("express");
const router = express.Router();
const axios = require("axios");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const UserDB = require("../routes/BL/BLSchema");

// ------------------ Faircent API Config ------------------
const BASE_URL = "https://api.faircent.com/v1/api";
const APP_ID = "1cfa78742af22b054a57fac6cf830699";
const APP_NAME = "KESHVACREDIT";
// const BASE_URL = "https://fcnode5.faircent.com";
// const APP_ID = "b27b11e13af255ef90f7c1939dcab2d2";
// const APP_NAME = "KESHVACREDIT";
// ------------------ Multer setup ------------------
const upload = multer({ dest: "uploads/" });

// ------------------ Lead Creation ------------------
router.post("/faircent/lead", async (req, res) => {
  try {
    const { payload } = req.body;
    if (!payload)
      return res
        .status(400)
        .json({ success: false, message: "Payload is required" });

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
      `${BASE_URL}/aggregrator/register/user`,
      faircentPayload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
        },
      },
    );

    // Save lead in DB
    const DBEnter = new UserDB({
      userData: payload,
      apiResponse: response.data,
      createdAt: new Date().toLocaleString(),
    });
    await DBEnter.save();

    return res.status(200).json({
      success: response.data?.success || false,
      message: response.data?.message || "Lead created",
      data: response.data,
    });
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

// ------------------ Document Upload ------------------
router.post("/faircent/upload", upload.single("docImage"), async (req, res) => {
  try {
    const { type, loan_id } = req.body; // Form-data fields
    const file = req.file; // Uploaded file
    const accessToken = req.header("x-access-token");

    if (!type || !loan_id || !file || !accessToken) {
      return res.status(400).json({
        success: false,
        message: "type, loan_id, docImage and x-access-token are required",
      });
    }

    // ------------------ Prepare FormData ------------------
    const form = new FormData();
    form.append("type", type);
    form.append("loan_id", loan_id);
    form.append("docImage", fs.createReadStream(file.path), {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    // ------------------ Hit Faircent API ------------------
    const response = await axios.post(`${BASE_URL}/uploadprocess`, form, {
      headers: {
        ...form.getHeaders(),
        "x-application-id": APP_ID,
        "x-application-name": APP_NAME,
        "x-access-token": accessToken,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    // Return response to client
    return res.status(200).json({
      success: true,
      faircentResponse: response.data,
      filePath: file.path, // path where file is temporarily stored
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: err.response?.data?.message,
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
