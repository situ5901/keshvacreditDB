const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// --- API Configuration ---
// const BASE_URL = "https://fcnode5.faircent.com";
// const APP_ID = "b27b11e13af255ef90f7c193dcab2d2";
// const APP_NAME = "KESHVACREDIT";


const BASE_URL = "https://api.faircent.com";
const APP_ID = "1cfa78742af22b054a57fac6cf830699";
const APP_NAME = "KESHVACREDIT";


const UPLOAD_ENDPOINT = "/v1/api/uploadprocess";

// 1. Define Multer and JSON Parsers
const upload = multer({ storage: multer.memoryStorage() });
const fileUploadMiddleware = upload.single("docImage"); // Multer handler
const jsonParser = express.json(); // JSON handler

// 2. Custom Middleware to check Content-Type and route the request
const contentCheckMiddleware = (req, res, next) => {
    // Get the Content-Type header
    const contentType = req.headers['content-type'];
    
    // DEBUG: Log the content type for diagnosis
    console.log(`[Middleware] Detected Content-Type: ${contentType}`);

    // Check for multipart/form-data (File Upload)
    if (contentType && contentType.includes('multipart/form-data')) {
        console.log("[Middleware] -> Routing to Multer for File Upload.");
        // Call Multer and let it handle the file and body parsing
        fileUploadMiddleware(req, res, next);
    } 
    // Check for application/json
    else if (contentType && contentType.includes('application/json')) {
        console.log("[Middleware] -> Routing to JSON Parser.");
        // Call the JSON parser
        jsonParser(req, res, next);
    }
    // If Content-Type is neither, proceed (could be just body data)
    else {
        // If no file/JSON is expected, just proceed
        console.log("[Middleware] -> Unknown Content-Type or text data. Continuing without specific parser.");
        // Since we removed the global express.json, we might need a basic urlencoded parser here if needed,
        // but for safety, we just continue, and the main logic will handle missing req.file/req.body.
        next(); 
    }
};

// =========================================================================

// Use the custom middleware in the route
// We removed upload.single("docImage") from here
router.post("/faircent/upload", contentCheckMiddleware, async (req, res) => {
    let tempPath;

    try {
        // DEBUG: Show incoming request info (Works for both JSON and File now)
        console.log("=== Incoming Request ===");
        console.log("Headers:", req.headers);
        console.log("Body:", req.body);
        console.log("File:", req.file); // Will be undefined for JSON requests
        console.log("========================");

        const token = req.body?.token || req.headers?.["x-access-token"];

        if (!token)
            return res.status(401).json({
                success: false,
                message: "Authentication token is missing. Send via header (x-access-token) or body (token).",
            });

        // --- 🎯 File Upload Logic (Runs ONLY if Multer was executed and found a file) ---
        if (req.file) {
            console.log("File detected. Proceeding with Faircent upload logic.");

            // Extract body data
            const loanId = req.body?.loan_id;
            const type = req.body?.type;

            // Enforce required fields for file upload
            if (!loanId || !type) {
                return res.status(400).json({
                    success: false,
                    message: "Missing loan_id or type in the file upload request body.",
                });
            }

            // Temporary File Creation
            const tempDir = path.join(__dirname, "temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const uniqueFilename = `${Date.now()}-${req.file.originalname}`;
            tempPath = path.join(tempDir, uniqueFilename);

            fs.writeFileSync(tempPath, req.file.buffer);
            console.log(`Temporary file written to: ${tempPath}`);

            // Prepare and send to Faircent API
            const formData = new FormData();
            formData.append("type", type);
            formData.append("loan_id", loanId);
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
        } 
        
        // --- 🚧 Error Handling for JSON/No File ---
        else {
            // If the code reaches here, it means:
            // 1. It was a JSON request (req.body is defined, req.file is undefined).
            // 2. It was a multipart request without a file (Multer ran but didn't populate req.file).
            
            // Assuming this endpoint primarily handles file upload:
            return res.status(400).json({
                success: false, 
                message: "File ('docImage') is required. Ensure Content-Type is 'multipart/form-data' for file upload, or check your JSON payload format.",
                received_body: req.body // Show what JSON was received
            });
        }
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
            message: "Failed to process request: " + errorMessage,
            error: err.response?.data || err.message,
        });
    } finally {
        // Cleanup temp file
        if (tempPath && fs.existsSync(tempPath)) {
            const logPath = path.relative(path.join(__dirname, 'temp'), tempPath);
            fs.unlinkSync(tempPath);
            console.log("Temporary file deleted:", logPath);
        }
    }
});

module.exports = router;
