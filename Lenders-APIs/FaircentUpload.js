const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const upload = multer({ storage: multer.memoryStorage() });
// ✅ UAT / PROD Settings
// const BASE_URL = "https://api.faircent.com";
// const APP_ID = "1cfa78742af22b054a57fac6cf830699";
// const APP_NAME = "KESHVACREDIT";

const BASE_URL = "https://fcnode5.faircent.com";
const APP_ID = "b27b11e13af255ef90f7c1939dcab2d2";
const APP_NAME = "KESHVACREDIT";

router.post("/upload", upload.single("docImage"), async (req, res) => {
  console.log("🔹 File upload request received");
  try {
    const token = req.body.token || req.headers["x-access-token"];
    if (!token)
      return res
        .status(400)
        .json({ success: false, message: "Access token is required" });
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });

    const formData = new FormData();
    formData.append("type", req.body.type || "PANCARD");
    formData.append("loan_id", req.body.loan_id || "1004688383");
    formData.append("docImage", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(
      "https://fcnode5.faircent.com/v1/api/uploadprocess",
      formData,
      {
        headers: {
          "x-application-id": "b27b11e13af255ef90f7c1939dcab2d2",
          "x-application-name": "KESHVACREDIT",
          "x-access-token": token, // ✅ dynamic token
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      },
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json(err.response?.data || { error: err.message });
  }
});

module.exports = router;
