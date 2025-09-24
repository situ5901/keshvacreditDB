const express = require("express");
const router = express.Router();
const axios = require("axios");
const FormData = require("form-data");
const multer = require("multer");
const UserDB = require("../routes/BL/BLSchema");

// ✅ UAT
// const BASE_URL = "https://fcnode5.faircent.com";
// const APP_ID = "b27b11e13af255ef90f7c1939dcab2d2";
// const APP_NAME = "KESHVACREDIT";

const BASE_URL = "https://api.faircent.com";
const APP_ID = "1cfa78742af22b054a57fac6cf830699";
const APP_NAME = "KESHVACREDIT";

const storage = multer.memoryStorage();
const upload = multer({ storage });

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

    const DBEnter = new UserDB({
      userData: payload,
      apiResponse: response.data,
      createdAt: new Date().toLocaleString(),
    });
    await DBEnter.save();

    if (response.data?.success)
      return res.status(200).json({
        success: true,
        message: response.data.message,
        data: response.data,
      });
    else
      return res.status(400).json({
        success: false,
        message: response.data.message,
        data: response.data,
      });
  } catch (err) {
    console.error(
      "Faircent Lead API Error:",
      err.response?.data || err.message,
    );
    return res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.message,
      error: err.response?.data || err.message,
    });
  }
});

router.post("/faircent/upload", upload.single("docImage"), async (req, res) => {
  try {
    const headers = {
      "x-application-id": req.headers["x-application-id"] || APP_ID,
      "x-application-name": req.headers["x-application-name"] || APP_NAME,
      "x-access-token": req.headers["x-access-token"],
    };

    const { type, loan_id } = req.body;

    const formData = new FormData();
    formData.append("type", type);
    formData.append("loan_id", loan_id);
    formData.append("docImage", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(
      `${BASE_URL}/v1/api/uploadprocess`,
      formData,
      {
        headers: { ...formData.getHeaders(), ...headers },
        responseType: "json",
      },
    );

    res.status(200).json(response.data);
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err.response?.data || err.message });
  }
});

module.exports = router;
