const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const otpStorage = new Map(); 


router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({status: "false" ,message: "Phone number required" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStorage.set(phone, { otp, expiresAt: Date.now() + 60000 }); 

    await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      { route: "q", message: `Your OTP is ${otp}`, language: "english", numbers: phone },
      { headers: { Authorization: process.env.FAST2SMS_API_KEY } }
    );

    res.status(200).json({status:"Success", message: "OTP Sent Successfully", otp }); // 🔥 Remove `otp` in production
  } catch (error) {
    res.status(500).json({ message: "Error sending OTP", error: error.message });
  }
});


router.post("/verify-otp", (req, res) => {
  const { phone, otp } = req.body;
  const otpData = otpStorage.get(phone);

  if (!otpData || otpData.otp !== parseInt(otp) || Date.now() > otpData.expiresAt) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  otpStorage.delete(phone);
  const token = jwt.sign({ phone }, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.status(200).json({ message: "OTP verified", token });
});

module.exports = router;
