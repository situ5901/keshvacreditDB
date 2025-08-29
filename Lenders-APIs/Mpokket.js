const express = require("express");
const router = express.Router();
const axios = require("axios");

const CreateUserAPI = "https://api.mpkt.in/acquisition-affiliate/v1/user";
const dedupeAPI = "https://api.mpkt.in/acquisition-affiliate/v1/dedupe/check""; // Replace with actual dedupe endpoint
const API_KEY = "2A331F81163D447C9B5941910D2BD";
const PartnerID = "Keshvacredit";

router.get("/mpokket", (req, res) => {
  res.send("Hello from Mpokket");
});

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
      dob, //
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

    if (dedupeRes.data.status === false) {
      return res.status(409).json({
        success: false,
        dedupeResponse: dedupeRes.data,
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
    };

    const pushRes = await axios.post(CreateUserAPI, pushPayload, {
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
    });

    console.log("✅ PreApproval API Response:", pushRes.data);

    res.status(200).json({
      success: true,
      data: {
        dedupe: dedupeRes.data,
        createUser: pushRes.data,
      },
    });
  } catch (err) {
    res.status(403).json({
      success: false,
      message: "❌ Internal Server Error",
      error: err.message || err,
    });
  }
});

module.exports = router;
