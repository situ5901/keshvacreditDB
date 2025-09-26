const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const upload = multer({ storage: multer.memoryStorage() });

// Configuration (kept for context, not part of the fix)
const BASE_URL = "https://fcnode5.faircent.com";
const APP_ID = "b27b11e13af255ef90f7c1939dcab2d2";
const APP_NAME = "KESHVACREDIT";

router.post("/upload", upload.single("docImage"), async (req, res) => {
  console.log("🔹 File upload request received");
  try {
    const token = req.body?.token || req.headers?.["x-access-token"];

    // This log is added for debugging to ensure token is being read
    // console.log("Token status:", token ? "Found" : "Not Found");

    if (!token)
      return res
        .status(400)
        .json({ success: false, message: "Access token is required" });

    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });

    const formData = new FormData();
    // Use optional chaining for safe access to req.body properties
    formData.append("type", req.body?.type || "PANCARD");
    formData.append("loan_id", req.body?.loan_id || "1004688383");

    formData.append("docImage", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(
      "https://fcnode5.faircent.com/v1/api/uploadprocess",
      formData,
      {
        headers: {
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
          "x-access-token": token, // ✅ dynamic token
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      },
    );

    res.json(response.data);
  } catch (err) {
    // Log the actual error object for better debugging
    console.error("Error during file upload:", err);

    // Handle axios error response data or use a generic 500
    res
      .status(500)
      .json(
        err.response?.data || { error: err.message || "Internal Server Error" },
      );
  }
});

module.exports = router;
