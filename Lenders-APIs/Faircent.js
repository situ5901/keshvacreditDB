const express = require("express");
const router = express.Router();
const axios = require("axios");
const FormData = require("form-data");
const multer = require("multer");

const BASE_URL = "https://api.faircent.com";
const APP_ID = "1cfa78742af22b054a57fac6cf830699";
const APP_NAME = "KESHVACREDIT";

// Multer Memory Storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ------------------ Faircent File Upload Proxy ------------------
router.post("/faircent/upload", upload.single("docImage"), async (req, res) => {
  try {
    const headers = {
      "x-application-id": req.headers["x-application-id"] || APP_ID,
      "x-application-name": req.headers["x-application-name"] || APP_NAME,
      "x-access-token": req.headers["x-access-token"],
    };

    if (!headers["x-access-token"])
      return res
        .status(400)
        .json({ success: false, message: "Missing x-access-token" });

    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "File 'docImage' is required" });

    const { type, loan_id } = req.body;
    if (!type || !loan_id)
      return res
        .status(400)
        .json({ success: false, message: "Missing type or loan_id" });

    const formData = new FormData();
    formData.append("type", type);
    formData.append("loan_id", loan_id);
    formData.append("docImage", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // Send to Faircent
    const response = await axios.post(
      `${BASE_URL}/v1/api/uploadprocess`,
      formData,
      {
        headers: { ...formData.getHeaders(), ...headers },
        responseType: "json", // Faircent returns JSON
      },
    );

    res.status(200).json(response.data);
  } catch (err) {
    console.error("Faircent Upload Error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.message,
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
