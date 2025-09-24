const express = require("express");
const router = express.Router();
const axios = require("axios");
const FormData = require("form-data");
const multer = require("multer");
const UserDB = require("../routes/BL/BLSchema");

const BASE_URL = "https://api.faircent.com";
const APP_ID = "1cfa78742af22b054a57fac6cf830699";
const APP_NAME = "KESHVACREDIT";

// ------------------ Multer Memory Storage (No disk) ------------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ------------------ Lead API ------------------
router.post("/faircent/lead", async (req, res) => {
  try {
    const { payload } = req.body;
    if (!payload)
      return res.status(400).json({ success: false, message: "Payload is required" });

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
      }
    );

    const DBEnter = new UserDB({
      userData: payload,
      apiResponse: response.data,
      createdAt: new Date().toLocaleString(),
    });
    await DBEnter.save();

    if (response.data?.success)
      return res.status(200).json({ success: true, message: response.data.message, data: response.data });
    else
      return res.status(400).json({ success: false, message: response.data.message, data: response.data });

  } catch (err) {
    console.error("❌ Faircent Lead API Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.message,
      error: err.response?.data || err.message,
    });
  }
});

// ------------------ Proxy API ------------------
router.post("/faircent/proxy", upload.any(), async (req, res) => {
  try {
    const headers = {
      "x-application-id": req.headers["x-application-id"],
      "x-application-name": req.headers["x-application-name"],
      "x-access-token": req.headers["x-access-token"],
    };

    if (!headers["x-application-id"] || !headers["x-application-name"] || !headers["x-access-token"])
      return res.status(400).json({ success: false, message: "Missing headers" });

    const formData = new FormData();

    // Normal fields
    for (let key in req.body) {
      formData.append(key, req.body[key]);
    }

    // Files from memory
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        formData.append(file.fieldname, file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      });
    }

    // Forward to Faircent
    const response = await axios.post(`${BASE_URL}/v1/api/uploadprocess`, formData, {
      headers: { ...formData.getHeaders(), ...headers },
      responseType: "text",
    });

    let jsonData;
    try {
      jsonData = JSON.parse(response.data);
    } catch (e) {
      console.error("⚠️ Faircent non-JSON response:", response.data);
      return res.status(500).json({
        success: false,
        message: "Faircent API returned non-JSON",
        raw_response: response.data,
      });
    }

    res.json(jsonData);
  } catch (error) {
    console.error("Faircent Proxy Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
      message: "Faircent API ko request forward karte samay error aa gaya.",
    });
  }
});

module.exports = router;
