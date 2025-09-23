const express = require("express");
const router = express.Router();
const axios = require("axios");
const FormData = require("form-data");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const UserDB = require("../routes/BL/BLSchema");

// ✅ UAT
// const BASE_URL = "https://fcnode5.faircent.com";
// const APP_ID = "b27b11e13af255ef90f7c1939dcab2d2";
// const APP_NAME = "KESHVACREDIT";

const BASE_URL = "https://api.faircent.com";
const APP_ID = "1cfa78742af22b054a57fac6cf830699";
const APP_NAME = "KESHVACREDIT";

// ✅ multer setup
const upload = multer({ dest: "uploads/" });

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

router.post("/faircent/upload", upload.single("docImage"), async (req, res) => {
  try {
    const { type, loan_id } = req.body;
    const accessToken = req.header("x-access-token");
    const file = req.file;

    if (!type || !loan_id || !file || !accessToken) {
      return res
        .status(400)
        .json({
          success: false,
          message: "type, loan_id, docImage, x-access-token required",
        });
    }

    const uploadDir = path.join(__dirname, "./uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

    const ext = path.extname(file.originalname) || "";
    const finalPath = path.join(uploadDir, `${file.filename}${ext}`);
    fs.renameSync(file.path, finalPath);

    const form = new FormData();
    form.append("type", type);
    form.append("loan_id", loan_id);
    form.append("docImage", fs.createReadStream(finalPath), {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const response = await axios.post(
      `${BASE_URL}/v1/api/uploadprocess`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
          "x-access-token": accessToken,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        responseType: "text", // ✅ Treat as text
      },
    );

    // Manual JSON parse
    let data;
    try {
      data = JSON.parse(response.data);
    } catch (e) {
      data = { success: true, message: response.data };
    }

    return res
      .status(200)
      .json({
        success: data.success,
        message: data.message,
        data,
        filePath: finalPath,
      });
  } catch (err) {
    console.error("❌ Upload API Error:", err.response?.data || err.message);
    return res
      .status(500)
      .json({
        success: false,
        message: err.message,
        error: err.response?.data || err.message,
      });
  }
});

module.exports = router;
