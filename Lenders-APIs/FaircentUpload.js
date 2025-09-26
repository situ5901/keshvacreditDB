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

router.post("/faircent/upload", upload.single("docImage"), async (req, res) => {
  let tempPath;
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "File is required" });
    }

    // ✅ Debug info before hitting Faircent
    console.log("Received file:", req.file.originalname);
    console.log("Loan ID:", req.body.loan_id);
    console.log("Type:", req.body.type);

    // ✅ Temp file creation
    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    tempPath = path.join(tempDir, req.file.originalname);
    fs.writeFileSync(tempPath, req.file.buffer);

    // ✅ Prepare FormData
    const formData = new FormData();
    formData.append("type", req.body.type);
    formData.append("loan_id", req.body.loan_id);
    formData.append("docImage", fs.createReadStream(tempPath));

    console.log("FormData prepared, ready to hit Faircent API");

    // ✅ Axios request
    const response = await axios.post(
      `${BASE_URL}${UPLOAD_ENDPOINT}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
        },
      },
    );

    console.log("✅ Faircent Upload API Response:", response.data);

    return res.status(200).json({ success: true, data: response.data });
  } catch (err) {
    console.error("❌ Upload API Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.message,
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
