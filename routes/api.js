const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model"); // Ensure correct path
const mongoose = require("mongoose");
const Lead = require("../models/RamFinSch.js");
require("dotenv").config();

const otpStorage = new Map();

router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        status: "false",
        message: "Phone number required",
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStorage.set(phone, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // Prepare SMS payload
    const payload = {
      route: "dlt",
      sender_id: "KVcred",
      message: "183062", // ✅ Your approved template ID
      variables_values: `${otp}|10`,
      flash: 0,
      numbers: phone,
    };

    // Send POST request
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      payload,
      {
        headers: {
          Authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
      },
    );

    res.status(200).json({
      status: "Success",
      message: "OTP sent successfully",
      // otp,
    });
  } catch (error) {
    console.error("SMS Error:", error.response?.data || error.message);
    res.status(500).json({
      message: "Error sending OTP",
      error: error.response?.data || error.message,
    });
  }
});

router.post("/verify-otp", (req, res) => {
  const { phone, otp } = req.body;
  const otpData = otpStorage.get(phone);

  if (
    !otpData ||
    otpData.otp !== parseInt(otp) ||
    Date.now() > otpData.expiresAt
  ) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  otpStorage.delete(phone);
  const token = jwt.sign({ phone }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.status(200).json({ status: "True", message: "OTP verified", token });
});

router.post("/userinfo", async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      employeeType,
      pan,
      pincode,
      loanAmount,
      income,
      dob,
    } = req.body;

    // Check for missing fields
    let missingFields = [];
    if (!name) missingFields.push("name");
    if (!phone) missingFields.push("phone");
    if (!email) missingFields.push("email");
    if (!employeeType) missingFields.push("employeeType");
    if (!pan) missingFields.push("pan");
    if (!pincode) missingFields.push("pincode");
    if (!loanAmount) missingFields.push("loanAmount");
    if (!income) missingFields.push("income");
    if (!dob) missingFields.push("dob");

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 400,
        error: "Missing required fields",
        missingFields,
      });
    }

    // Validate phone number (10 digits)
    if (!/^\d{10}$/.test(phone)) {
      return res
        .status(400)
        .json({ status: 400, error: "Invalid phone number format" });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res
        .status(400)
        .json({ status: 400, error: "Invalid email format" });
    }

    // Validate PAN card (Alphanumeric, 10 characters)
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      return res
        .status(400)
        .json({ status: 400, error: "Invalid PAN card format" });
    }

    // Validate Pincode (6 digits)
    if (!/^\d{6}$/.test(pincode)) {
      return res
        .status(400)
        .json({ status: 400, error: "Invalid pincode format" });
    }

    // Validate loan amount and income (should be numeric)
    if (isNaN(loanAmount) || isNaN(income)) {
      return res.status(400).json({
        status: 400,
        error: "Loan amount and income should be numeric",
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return res.status(400).json({
        status: 400,
        error: "Invalid date of birth format (YYYY-MM-DD expected)",
      });
    }

    const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
    if (existingUser) {
      return res.status(409).json({
        status: 409,
        error: "User with this phone or email already exists",
      });
    }

    // Save user data with default partner "Keshvacredit"
    const newUser = new User({
      name,
      phone,
      email,
      employeeType,
      pan,
      pincode,
      loanAmount,
      income,
      dob,
      partner: "Keshvacredit", // Default partner
    });

    await newUser.save();
    res.status(201).json({
      status: 201,
      message: "User information saved successfully",
      user: newUser,
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

router.post("/getUsers", async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }
  try {
    const user = await User.findOne({ phone });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});
//eligibil Lender API//
router.post("/ramfinwebAPI", async (req, res) => {
  try {
    const { mobile, name, email, employeeType, dob, pancard, loanAmount } =
      req.body;
    if (
      !mobile ||
      !name ||
      !email ||
      !employeeType ||
      !dob ||
      !pancard ||
      !loanAmount
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Prepare data for RamfinCorp API
    const RamData = {
      mobile,
      name,
      loanAmount,
      email,
      employeeType,
      dob,
      pancard,
      PartnerName: "Keshvacredit",
    };

    // Log the request body for debugging
    console.log("Request Body:", req.body);

    // Call the RamfinCorp API
    const ramfinResponse = await axios.post(
      "https://preprod.ramfincorp.co.in/loanapply/ramfincorp_api/lead_gen/api/v1/create_lead",
      RamData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic cmFtZmluX3FwZzhUZ1pGemlTcTY5ejRWb01wd3E2dGdLYUprUDZtOkUydmp4a0pCbHNWZFRFQkhkQ3puV29Nak1IN0ZSS3NW",
        },
      },
    );

    // Log the API response for debugging
    console.log("Ramfin Response:", ramfinResponse.data);

    // Save data to MongoDB
    const newLead = new Lead({
      mobile,
      name,
      email,
      employeeType,
      dob,
      pancard,
      loanAmount,
    });

    // Save to the database
    await newLead.save();

    // Log the saved lead
    console.log("Lead saved:", newLead);

    // Success response
    res.status(200).json({
      message: "Lead created successfully!",
      apiResponse: ramfinResponse.data,
      lead: newLead,
    });
  } catch (error) {
    // Handle errors
    if (error.response) {
      console.error("API Error Response:", error.response.data);
      res.status(error.response.status).json({
        message: "RamfinCorp API returned an error",
        statusCode: error.response.status,
        apiError: error.response.data,
      });
    } else {
      console.error("Error:", error.message);
      res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  }
});

module.exports = router;
