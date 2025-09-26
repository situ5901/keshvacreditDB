const express = require("express");
const uploadRouter = express.Router();
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const storage = multer.memoryStorage();
const upload = multer({ storage });

const BASE_URL = "https://api.faircent.com";
const APP_ID = "1cfa78742af22b054a57fac6cf830699";
const APP_NAME = "KESHVACREDIT";
const UPLOAD_ENDPOINT = "/v1/api/uploadprocess";
const TARGET_URL = BASE_URL + UPLOAD_ENDPOINT; // Target URL को पहले ही परिभाषित करें

// ****************************** CONSOLE LOG ADDED ******************************

uploadRouter.post(
  "/faircent/upload",
  upload.single("docImage"),
  async (req, res) => {
    console.log("=================================================");
    console.log("🚀 [STEP 1] Faircent Upload Request Received.");

    // --- Step 1: Multer Check ---
    if (!req.file || !req.body.loan_id || !req.body.type) {
      console.log("❌ [ERROR] Missing Data Check Failed.");
      console.log(
        `File: ${!!req.file}, loan_id: ${req.body.loan_id}, type: ${req.body.type}`,
      );
      return res
        .status(400)
        .json({ error: "Missing file, loan_id, or type in request." });
    }

    // --- Step 2: Data Extraction ---
    console.log("✅ [STEP 2] Multer executed successfully. Data Extracted:");
    console.log(`  - Loan ID: ${req.body.loan_id}`);
    console.log(`  - Document Type: ${req.body.type}`);
    console.log(`  - File Name: ${req.file.originalname}`);
    console.log(`  - File Size: ${req.file.size} bytes`); // 3. Faircent को भेजने के लिए नया FormData ऑब्जेक्ट बनाएँ

    const form = new FormData();
    form.append("type", req.body.type);
    form.append("loan_id", req.body.loan_id);

    // req.file.buffer से फाइल जोड़ें
    form.append("docImage", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    console.log("🛠️ [STEP 3] FormData Object Created for Faircent.");
    console.log(`  - Target URL: ${TARGET_URL}`);

    // Access Token Placeholder (ज़रूरी)
    const ACCESS_TOKEN = "your_valid_access_token_here"; // <--- इसे अपडेट करें
    // 4. Faircent API को कॉल करें

    try {
      const headers = {
        "x-application-id": APP_ID,
        "x-application-name": APP_NAME,
        "x-access-token": ACCESS_TOKEN, // Access Token यहाँ भेजें
        ...form.getHeaders(),
      };

      console.log("🔍 [STEP 4] Sending Request to Faircent with Headers:");
      console.log(headers);

      const faircentResponse = await axios.post(TARGET_URL, form, { headers });

      // --- Step 5: Success Response ---
      console.log("✅ [STEP 5] Successfully Received Response from Faircent.");
      console.log(`  - HTTP Status: ${faircentResponse.status}`);
      console.log("  - Response Data:", faircentResponse.data); // 6. Faircent का जवाब क्लाइंट को वापस भेजें

      return res.status(faircentResponse.status).json(faircentResponse.data);
    } catch (error) {
      // --- Step 7: Error Handling ---
      console.error(
        "❌ [ERROR] An error occurred during Faircent communication:",
      );

      if (error.response) {
        // Faircent से HTTP Error Response मिला
        console.error(`  - HTTP Status: ${error.response.status}`);
        console.error("  - Faircent Error Data:", error.response.data);
        return res.status(error.response.status).json(error.response.data);
      } else if (error.request) {
        // Faircent से कोई Response नहीं मिला (जैसे Timeout या DNS Error)
        console.error(
          "  - No response received from Faircent (Request issue).",
        );
        console.error("  - Request details:", error.request);
      } else {
        // Local Error (जैसे कॉन्फ़िगरेशन, टोकन, आदि)
        console.error("  - Local error or Axios setup issue.");
        console.error("  - Message:", error.message);
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error while forwarding file.",
        detail: error.message,
      });
    } finally {
      console.log("=================================================\n");
    }
  },
);

module.exports = uploadRouter;
