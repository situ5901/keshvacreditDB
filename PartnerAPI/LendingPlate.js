const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const User = require("../models/user.model.js");

// ✅ Flexible Schema
const loopSchema = new mongoose.Schema({}, { strict: false });
const Loop = mongoose.model("loop", loopSchema);

// ✅ POST API to store any data
router.post("/post-data", async (req, res) => {
  try {
    console.log("🔹 Received Data:", req.body);

    // ✅ Check if request body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log("🚫 No Data Provided");
      return res.status(400).json({
        status: "failed",
        message: "No data provided",
      });
    }

    // ✅ Save data to MongoDB
    const newData = new Loop(req.body);
    await newData.save();

    console.log("✅ Data Saved:", newData);
    res.status(201).json({
      status: "success",
      message: "Lead created successfully",
      data: newData,
    });
  } catch (error) {
    console.error("🚫 Error Saving Data:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Internal Server Error",
    });
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone)
      return res
        .status(400)
        .json({ status: "failed", message: "Phone number is required" });

    const otpCode = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP

    // ✅ Send OTP using Fast2SMS
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "otp",
        message: `Your OTP is ${otpCode}`,
        flash: 0,
        numbers: phone,
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.data.return) {
      // ✅ Save OTP in MongoDB
      await OTP.findOneAndUpdate(
        { phone },
        { otp: otpCode, createdAt: new Date() },
        { upsert: true },
      );
      return res
        .status(200)
        .json({ status: "success", message: "OTP sent successfully" });
    } else {
      return res
        .status(500)
        .json({
          status: "failed",
          message: "Failed to send OTP",
          error: response.data,
        });
    }
  } catch (error) {
    console.error("🚫 Error Sending OTP:", error);
    res
      .status(500)
      .json({
        status: "error",
        message: "Internal Server Error",
        error: error.message,
      });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp)
      return res
        .status(400)
        .json({
          status: "failed",
          message: "Phone number and OTP are required",
        });

    const otpRecord = await OTP.findOne({ phone, otp });
    if (!otpRecord)
      return res
        .status(400)
        .json({ status: "failed", message: "Invalid or expired OTP" });

    await OTP.deleteOne({ phone }); // ✅ Delete OTP after successful verification
    return res
      .status(200)
      .json({ status: "success", message: "OTP verified successfully" });
  } catch (error) {
    console.error("🚫 Error Verifying OTP:", error);
    res
      .status(500)
      .json({
        status: "error",
        message: "Internal Server Error",
        error: error.message,
      });
  }
});

module.exports = router; // ✅ Export Router
