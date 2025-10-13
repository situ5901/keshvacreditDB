const express = require("express");
const router = express.Router();
const axios = require("axios");

// 🔗 API Endpoints & Config
const CreateUserAPI = "https://api.mpkt.in/acquisition-affiliate/v2/user";
const dedupeAPI = "https://api.mpkt.in/acquisition-affiliate/v2/dedupe/check";
const API_KEY = "3A331F81163D447C9B5941910D2BD";
const PartnerID = "Keshvacredit";

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

    if (!email || !phone) {
      return res.status(400).json({
        success: false,
        error: "Email or phone missing in request body",
      });
    }

    // Base64 encoding
    const encodedEmail = Buffer.from(email.trim()).toString("base64");
    const encodedPhone = Buffer.from(phone.trim()).toString("base64");

    // Step 1: Dedupe API call
    const dedupePayload = {
      email_id: encodedEmail,
      mobile_number: encodedPhone,
      partnerId: PartnerID,
    };

    const dedupeRes = await axios.post(dedupeAPI, dedupePayload, {
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
    });

    const isNewUser =
      dedupeRes?.data?.status_code === "1205" ||
      dedupeRes?.data?.message?.toLowerCase() === "new user";

    // If not new user → return dedupe response only
    if (!isNewUser) {
      return res.status(200).json(dedupeRes.data);
    }

    // Step 2: CreateUser API (only if new user)
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

    const pushRes = await axios.post(CreateUserAPI, pushPayload, {
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
    });

    // Return combined data without extra text
    return res.status(200).json({
      dedupe: dedupeRes.data,
      createUser: pushRes.data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.response?.data || err.message,
    });
  }
});

module.exports = router;
