const express = require("express");
const router = express.Router();
const axios = require("axios");
const FormData = require("form-data");
const multer = require("multer");
const UserDB = require("../routes/BL/BLSchema");

const BASE_URL = "https://api.faircent.com";
const APP_ID = "1cfa78742af22b054a57fac6cf830699";
const APP_NAME = "KESHVACREDIT";

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/faircent/lead", async (req, res) => {
  try {
    const { payload } = req.body;
    if (!payload)
      return res
        .status(400)
        .json({ success: false, message: "Payload is required" });

    const faircentPayload = {
      fname: payload.fname,
      lname: payload.lname,
      dob: payload.dob,
      pan: payload.pan,
      mobile: payload.mobile,
      pin: payload.pin,
      state: payload.state,
      city: payload.city,
      address: payload.address,
      mail: payload.mail,
      gender: payload.gender,
      employment_status: payload.employment_status,
      loan_purpose: payload.loan_purpose,
      loan_amount: payload.loan_amount,
      monthly_income: payload.monthly_income,
    };

    const response = await axios.post(
      `${BASE_URL}/v1/api/aggregrator/register/user`,
      faircentPayload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
        },
      },
    );

    const DBEnter = new UserDB({
      userData: payload,
      apiResponse: response.data,
      createdAt: new Date().toLocaleString(),
    });
    await DBEnter.save();

    if (response.data?.success)
      return res.status(200).json({
        success: true,
        message: response.data.message,
        data: response.data,
      });
    else
      return res.status(400).json({
        success: false,
        message: response.data.message,
        data: response.data,
      });
  } catch (err) {
    console.error(
      "Faircent Lead API Error:",
      err.response?.data || err.message,
    );
    return res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.message,
      error: err.response?.data || err.message,
    });
  }
});

router.post("/faircent/upload", upload.single("docImage"), async (req, res) => {
  console.log("==========================================");
  console.log("🔹 New upload request received at:", new Date().toLocaleString());

  try {
    console.log("Step 1️⃣ - Incoming request headers:");
    console.log(req.headers);

    console.log("Step 2️⃣ - Incoming request body:");
    console.log(req.body);

    console.log("Step 3️⃣ - Incoming file info:");
    if (req.file) {
      console.log({
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
    } else {
      console.log("No file received");
    }

    const headers = {
      "x-application-id": req.headers["x-application-id"] || APP_ID,
      "x-application-name": req.headers["x-application-name"] || APP_NAME,
      "x-access-token": req.headers["x-access-token"],
    };
    console.log("Step 4️⃣ - Headers used for Faircent API:");
    console.log(headers);

    if (!headers["x-access-token"]) {
      console.log("❌ Step 5️⃣ - Missing x-access-token");
      return res.status(400).json({ success: false, message: "Missing x-access-token" });
    }

    const { type, loan_id } = req.body;
    if (!type || !loan_id) {
      console.log("❌ Step 6️⃣ - Missing type or loan_id in request body");
      return res.status(400).json({ success: false, message: "Missing type or loan_id" });
    }

    if (!req.file) {
      console.log("❌ Step 7️⃣ - File 'docImage' is required but not received");
      return res.status(400).json({ success: false, message: "File 'docImage' is required" });
    }

    console.log("Step 8️⃣ - Preparing FormData to forward to Faircent API");
    const formData = new FormData();
    formData.append("type", type);
    formData.append("loan_id", loan_id);
    formData.append("docImage", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    console.log("Step 9️⃣ - FormData prepared successfully");

    console.log("Step 🔟 - Forwarding request to Faircent API...");
    const response = await axios.post(`${BASE_URL}/v1/api/uploadprocess`, formData, {
      headers: { ...formData.getHeaders(), ...headers },
      responseType: "json",
    });

    console.log("Step 1️⃣1️⃣ - Response received from Faircent API:");
    console.log(response.data);

    console.log("==========================================");
    res.status(200).json(response.data);
  } catch (err) {
    console.error("❌ Step 1️⃣2️⃣ - Faircent Upload Error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.message,
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
