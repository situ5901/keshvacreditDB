const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs"); // Added fs
const path = require("path"); // Added path

// const BASE_URL = "https://api.faircent.com";
// const APP_ID = "1cfa78742af22b054a57fac6cf830699";
// const APP_NAME = "KESHVACREDIT";

const BASE_URL = "https://fcnode5.faircent.com";
const APP_ID = "b27b11e13af255ef90f7c1939dcab2d2";
const APP_NAME = "KESHVACREDIT";


const UPLOAD_ENDPOINT = "/v1/api/uploadprocess";

const upload = multer({ storage: multer.memoryStorage() });

router.post("/faircent/upload", upload.single("docImage"), async (req, res) => {
  let tempPath;
  try {
    const token = req.body?.token || req.headers?.["x-access-token"];

    if (!token)
      return res.status(401).json({
        success: false,
        message:
          "Authentication token is missing. Send via header (x-access-token) or body (token).",
      });

    // Check for file first, as originally done
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "File is required" });
    }

    // --- Logging and File Preparation ---
    console.log("Received file:", req.file.originalname);
    console.log("Loan ID:", req.body.loan_id);
    console.log("Type:", req.body.type);

    // Use optional chaining for safe access to req.body parameters
    const loanId = req.body?.loan_id;
    const type = req.body?.type;

    // ✅ Temp file creation
    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true }); // Use recursive: true for safety

    // Create a unique filename to prevent conflicts
    const uniqueFilename = `${Date.now()}-${req.file.originalname}`;
    tempPath = path.join(tempDir, uniqueFilename);

    fs.writeFileSync(tempPath, req.file.buffer);
    console.log(`Temporary file written to: ${tempPath}`);

    // ✅ Prepare FormData
    const formData = new FormData();
    formData.append("type", type || "PANCARD"); // Use defaults for robustness
    formData.append("loan_id", loanId || "1004688383");
    formData.append("docImage", fs.createReadStream(tempPath));

    console.log("FormData prepared, ready to hit Faircent API");

    // ✅ Axios request
    const response = await axios.post(
      `${BASE_URL}${UPLOAD_ENDPOINT}`, // Ensure BASE_URL and UPLOAD_ENDPOINT are defined
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          // ✅ Re-added authentication token
          "x-access-token": token,
          "x-application-id": APP_ID, // Ensure APP_ID is defined
          "x-application-name": APP_NAME, // Ensure APP_NAME is defined
        },
        // Add these for large file uploads
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      },
    );

    console.log("✅ Faircent Upload API Response:", response.data);

    return res.status(200).json({ success: true, data: response.data });
  } catch (err) {
    console.error("❌ Upload API Error:", err.response?.data || err.message);

    // More specific error handling for the user
    let errorMessage = "Internal Server Error";
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
    // ✅ Cleanup temp file
    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
      console.log("Temporary file deleted:", tempPath);
    }
  }
});

module.exports = router;
