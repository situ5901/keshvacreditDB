const express = require("express");
const router = express.Router();
const axios = require("axios");
const FormData = require("form-data");
const formidable = require("formidable");
const fs = require("fs");
const UserDB = require("../routes/BL/BLSchema");

// Faircent config
const BASE_URL = "https://fcnode5.faircent.com";
const APP_ID = "b27b11e13af255ef90f7c1939dcab2d2";
const APP_NAME = "KESHVACREDIT";

// ------------------ Lead API ------------------
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
      "❌ Faircent Lead API Error:",
      err.response?.data || err.message,
    );
    return res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.message,
      error: err.response?.data || err.message,
    });
  }
});

// ------------------ Upload API ------------------
router.post("/faircent/upload", (req, res) => {
  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err)
      return res.status(400).json({ success: false, message: err.message });

    const { type, loan_id } = fields;
    const docImage = files.docImage;

    const {
      "x-application-id": appId,
      "x-application-name": appName,
      "x-access-token": accessToken,
    } = req.headers;

    if (!type || !loan_id || !docImage || !appId || !appName || !accessToken) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("loan_id", loan_id);
      formData.append("docImage", fs.createReadStream(docImage.filepath), {
        filename: docImage.originalFilename,
        contentType: docImage.mimetype,
      });

      const response = await axios.post(
        `${BASE_URL}/v1/api/uploadprocess`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            "x-application-id": appId,
            "x-application-name": appName,
            "x-access-token": accessToken,
          },
        },
      );

      res.json(response.data);
    } catch (error) {
      console.error(error.response?.data || error.message);
      res
        .status(500)
        .json({ success: false, error: error.response?.data || error.message });
    }
  });
});

module.exports = router;
