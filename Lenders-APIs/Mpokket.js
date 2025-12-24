const express = require("express");
const router = express.Router();
const axios = require("axios");
const { saveApiResponse } = require("../utils/saveApiResponse"); // ✅ import helper

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

    if (!email || !phone) {
      throw new Error("Email or Phone is missing in user object");
    }

    const encodedEmail = Buffer.from(email).toString("base64");
    const encodedPhone = Buffer.from(phone).toString("base64");

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

    console.log("✅ Eligibility API Response:", dedupeRes.data);

    // Save dedupe API response
    await saveApiResponse(phone, "Mpokket-Dedupe", dedupeRes.data, "success");

    if (dedupeRes.data.message !== "New User") {
      console.log("⚠️ Existing user or other status - skipping CreateUser API");
      return res.status(200).json({
        data: {
          dedupe: dedupeRes.data,
        },
        break: true,
      });
    }

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

    console.log("✅ PreApproval API Response:", pushRes.data);

    // Save create user API response
    await saveApiResponse(phone, "Mpokket-CreateUser", pushRes.data, "success");

    res.status(201).json({
      success: true,
      message: "New user created successfully",
      data: {
        dedupe: dedupeRes.data,
        createUser: pushRes.data,
      },
    });
  } catch (err) {
    console.error(
      "❌ Error in /partner/mpokket:",
      err.message,
      err.response?.data,
    );

    // Save failure response
    await saveApiResponse(
      req.body?.phone || "unknown",
      "Mpokket",
      err.response?.data || err.message,
      "failure",
      "API call failed"
    );

    res.status(500).json({
      success: false,
      message: "❌ Internal Server Error",
      error: err.response?.data || err.message || "An unknown error occurred",
    });
  }
});


module.exports = router;