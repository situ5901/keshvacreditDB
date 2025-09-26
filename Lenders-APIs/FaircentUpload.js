const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// --- API Configuration ---
// Note: Using the second set of credentials as they are the ones active in your code
const BASE_URL = "https://fcnode5.faircent.com";
const APP_ID = "b27b11e13af255ef90f7c1939dcab2d2";
const APP_NAME = "KESHVACREDIT";

const UPLOAD_ENDPOINT = "/v1/api/uploadprocess";

const upload = multer({ storage: multer.memoryStorage() });

router.post("/faircent/upload", upload.single("docImage"), async (req, res) => {
  let tempPath;

  try {
    // DEBUG: Show incoming request info
    console.log("=== Incoming Request ===");
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);
    console.log("File:", req.file);
    console.log("========================");

    const token = req.body?.token || req.headers?.["x-access-token"];

    if (!token)
      return res.status(401).json({
        success: false,
        message:
          "Authentication token is missing. Send via header (x-access-token) or body (token).",
      });

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "File is required" });
    }

    // Extract body data
    const loanId = req.body?.loan_id;
    const type = req.body?.type;

    // Temporary File Creation
    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const uniqueFilename = `${Date.now()}-${req.file.originalname}`;
    tempPath = path.join(tempDir, uniqueFilename);

    fs.writeFileSync(tempPath, req.file.buffer);
    console.log(`Temporary file written to: ${tempPath}`); // This log still shows full path for debugging/verification

    // Prepare and send to Faircent API
    const formData = new FormData();
    formData.append("type", type || "PANCARD");
    formData.append("loan_id", loanId || "1004688383");
    formData.append("docImage", fs.createReadStream(tempPath));

    console.log("FormData prepared, ready to hit Faircent API");

    const response = await axios.post(
      `${BASE_URL}${UPLOAD_ENDPOINT}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "x-access-token": token,
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    console.log("✅ Faircent Upload API Response:", response.data);

    return res.status(200).json({ success: true, data: response.data });
  } catch (err) {
    console.error("❌ Upload API Error:", err.response?.data || err.message);

    let errorMessage = "Internal Server Error during file transfer.";
    if (err.response?.data) {
      errorMessage =
        err.response.data.message || JSON.stringify(err.response.data);
    } else if (err.message) {
      errorMessage = err.message;
    }

    return res.status(err.response?.status || 500).json({
      success: false,
      message: "Failed to process file upload: " + errorMessage,
      error: err.response?.data || err.message,
    });
  } finally {
    // Cleanup temp file
    if (tempPath && fs.existsSync(tempPath)) {
      // 🎯 MODIFICATION: Calculate the relative path for logging
      // This will show only the filename (e.g., '1710928800000-document.jpg')
      const logPath = path.relative(path.join(__dirname, 'temp'), tempPath);

      fs.unlinkSync(tempPath);
      console.log("Temporary file deleted:", logPath);
    }
  }
});

module.exports = router;
