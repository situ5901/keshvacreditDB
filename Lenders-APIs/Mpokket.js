const express = require("express");
const router = express.Router();
const axios = require("axios");

// 🔗 API Endpoints & Config
const CreateUserAPI = "https://api.mpkt.in/acquisition-affiliate/v1/user";
const dedupeAPI = "https://api.mpkt.in/acquisition-affiliate/v1/dedupe/check";
const API_KEY = "2A331F81163D447C9B5941910D2BD";
const PartnerID = "Keshvacredit";

// ✅ Simple test route
router.get("/mpokket", (req, res) => {
  res.send("Hello from Mpokket");
});

// ✅ Main partner route
router.post("/partner/mpokket", async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      pan,
      pincode,
      employment,
      income,
      loanAmount,
      dob,
    } = req.body;

    // Validation
    if (!email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Email or phone is missing in request body",
      });
    }

    // 🧩 Base64 encode
    const encodedEmail = Buffer.from(email.trim()).toString("base64");
    const encodedPhone = Buffer.from(phone.trim()).toString("base64");

    // ✅ Step 1: Dedupe Check
    const dedupePayload = {
      email_id: encodedEmail,
      mobile_number: encodedPhone,
      partnerId: PartnerID,
    };

    console.log("📤 Sending Dedupe Payload:", dedupePayload);

    const dedupeRes = await axios.post(dedupeAPI, dedupePayload, {
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
    });

    console.log("✅ Dedupe API Response:", dedupeRes.data);

    // 🧠 Check if new user
    const isNewUser =
      dedupeRes?.data?.status_code === "1205" ||
      dedupeRes?.data?.message?.toLowerCase() === "new user";

    if (!isNewUser) {
      console.log("⚠️ Existing user — skipping CreateUser API");

      return res.status(200).json({
        success: true,
        message: "User already exists — skipping CreateUser API",
        dedupe: dedupeRes.data,
      });
    }

    // ✅ Step 2: Create User (only for new users)
    const pushPayload = {
      mobile_no: phone.toString(),
      pancard: pan,
      email_id: email,
      Full_name: name,
      date_of_birth: dob,
      profession: employment,
      partnerId: PartnerID,
      pincode,
      income,
      loan_amount: loanAmount,
    };

    console.log("📤 Sending CreateUser Payload:", pushPayload);

    const pushRes = await axios.post(CreateUserAPI, pushPayload, {
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
    });

    console.log("✅ CreateUser API Response:", pushRes.data);

    // ✅ Final Response
    return res.status(200).json({
      success: true,
      message: "New user created successfully",
      data: {
        dedupe: dedupeRes.data,
        createUser: pushRes.data,
      },
    });
  } catch (err) {
    console.error("❌ Error occurred:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err?.response?.data || err.message,
    });
  }
});

module.exports = router;
