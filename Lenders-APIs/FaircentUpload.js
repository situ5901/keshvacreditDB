const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs"); 
const path = require("path");

// --- API Configuration ---
// Note: Ensure these URLs and IDs are correct for your environment.
const BASE_URL = "https://fcnode5.faircent.com";
const APP_ID = "b27b11e13af255ef90f7c1939dcab2d2";
const APP_NAME = "KESHVACREDIT";
const UPLOAD_ENDPOINT = "/v1/api/uploadprocess";
// -------------------------

// Configure Multer to store files in memory (as a buffer) before processing
const upload = multer({ storage: multer.memoryStorage() });

router.post("/faircent/upload", upload.single("docImage"), async (req, res) => {
    let tempPath; // Declared here so it's accessible in the finally block
    try {
        // 1. Authentication Check
        const token = req.body?.token || req.headers?.["x-access-token"];

        if (!token)
            return res.status(401).json({
                success: false,
                message: "Authentication token is missing. Send via header (x-access-token) or body (token).",
            });

        // 2. File Check
        if (!req.file) {
            return res
                .status(400)
                .json({ success: false, message: "File is required" });
        }

        // Extract and validate body data safely
        const loanId = req.body?.loan_id;
        const type = req.body?.type;

        // 3. Temporary File Creation (Essential for streaming with form-data)
        const tempDir = path.join(__dirname, "temp");
        // Create the temp directory if it doesn't exist
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        // Create a unique filename to prevent conflicts during concurrent uploads
        const uniqueFilename = `${Date.now()}-${req.file.originalname}`;
        tempPath = path.join(tempDir, uniqueFilename);

        // Write the file buffer (from multer) to the disk
        fs.writeFileSync(tempPath, req.file.buffer);
        console.log(`Temporary file written to: ${tempPath}`);

        // 4. Prepare and Send to External API
        const formData = new FormData();
        formData.append("type", type || "PANCARD"); 
        formData.append("loan_id", loanId || "1004688383");
        // Append the file as a read stream
        formData.append("docImage", fs.createReadStream(tempPath));

        console.log("FormData prepared, ready to hit Faircent API");

        const response = await axios.post(
            `${BASE_URL}${UPLOAD_ENDPOINT}`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(), // Required to set the boundary for the FormData stream
                    "x-access-token": token,
                    "x-application-id": APP_ID,
                    "x-application-name": APP_NAME,
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            },
        );

        console.log("✅ Faircent Upload API Response:", response.data);

        return res.status(200).json({ success: true, data: response.data });
    } catch (err) {
        // 5. Error Handling
        console.error("❌ Upload API Error:", err.response?.data || err.message);

        let errorMessage = "Internal Server Error during file transfer.";
        if (err.response?.data) {
            errorMessage = err.response.data.message || JSON.stringify(err.response.data);
        } else if (err.message) {
            errorMessage = err.message;
        }

        return res.status(err.response?.status || 500).json({
            success: false,
            message: "Failed to process file upload: " + errorMessage,
            error: err.response?.data || err.message,
        });
    } finally {
        // 6. Cleanup
        if (tempPath && fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
            console.log("Temporary file deleted:", tempPath);
        }
    }
});

// CRITICAL: Export the router instance
module.exports = router;
