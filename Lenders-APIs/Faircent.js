const express = require("express");
const router = express.Router();
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
const fs = require("fs");

const FAIRCENT_BASE_URL = "https://fcnode5.faircent.com";
const APP_ID = "b27b11e13af255ef90f7c1939dcab2d2";
const APP_NAME = "KESHVACREDIT";

// Multer storage config
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

// --------------------------
// Faircent Lead API Route
// --------------------------
router.post("/faircent/lead", async (req, res) => {
  try {
    const { payload } = req.body;

    if (!payload) {
      return res.status(400).json({ success: false, message: "Payload is required" });
    }

    const sign_ip = req.header("x-forwarded-for") || req.ip || "127.0.0.1";
    const sign_time = Math.floor(Date.now() / 1000);

    const faircentPayload = {
      ...payload,
      consent: "Y",
      tnc_link: "https://www.faircent.in/terms-conditions",
      sign_ip,
      sign_time,
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
      }
    );

    return res.status(response.data?.success ? 200 : 400).json({
      success: response.data?.success || false,
      message: response.data?.message || "Operation completed",
      data: response.data,
    });
  } catch (err) {
    console.error("❌ Faircent Lead API Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.message || "Internal Server Error",
      error: err.response?.data || err.message,
    });
  }
});

// --------------------------
// Faircent Document Upload Proxy Route
// --------------------------
router.post(
  "/faircent/upload-doc-proxy",
  upload.single("docImage"),
  async (req, res) => {
    try {
      const { loan_id, type, access_token } = req.body;
      const filePath = req.file?.path;

      if (!loan_id || !type || !filePath || !access_token) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: loan_id, type, access_token, or file.",
        });
      }

      const form = new FormData();
      form.append("loan_id", loan_id);
      form.append("type", type);
      form.append("docImage", fs.createReadStream(filePath));

      const response = await axios.post(`${FAIRCENT_BASE_URL}/v1/api/uploadprocess`, form, {
        headers: {
          ...form.getHeaders(),
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
          "x-access-token": access_token,
        },
      });

      // Delete uploaded file after proxying
      fs.unlink(filePath, (err) => {
        if (err) console.error("Error deleting file:", err);
      });

      return res.status(response.data?.success ? 200 : 400).json({
        success: response.data?.success || false,
        message: response.data?.message || "Document upload completed",
        data: response.data,
      });
    } catch (err) {
      console.error(
        "❌ Faircent Upload Document Proxy API Error:",
        err.response?.data || err.message
      );
      return res.status(500).json({
        success: false,
        message: err.response?.data?.message || err.message || "Internal Server Error",
        error: err.response?.data || err.message,
      });
    }
  }
);

module.exports = router;
