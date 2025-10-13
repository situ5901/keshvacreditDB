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

    // 1. Validation Check
    if (!email || !phone) {
      // Throwing an error will be caught by the catch block
      throw new Error("Email or Phone is missing in user object");
    }

    // 2. Base64 Encode
    const encodedEmail = Buffer.from(email).toString("base64");
    const encodedPhone = Buffer.from(phone).toString("base64");

    // 3. Dedupe Payload
    const dedupePayload = {
      email_id: encodedEmail,
      mobile_number: encodedPhone,
      partnerId: PartnerID,
    };

    // 4. Hit Dedupe API
    const dedupeRes = await axios.post(dedupeAPI, dedupePayload, {
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
    });

    console.log("✅ Eligibility API Response:", dedupeRes.data);

    // 5. Check Dedupe Result & Decide Execution Flow

    // If the message is NOT "New User", we stop execution using 'return'.
    if (dedupeRes.data.message !== "New User") {
      console.log("⚠️ Existing user or other status - skipping CreateUser API");

      // Use 'return res.status(...)' to stop the function and send a response
      return res.status(200).json({
        success: true,
        message: "User is not New User - CreateUser API skipped",
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
      loan_amount: loanAmount, // Included from your previous payload
    };

    // 7. Hit Create User API
    const pushRes = await axios.post(CreateUserAPI, pushPayload, {
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
    });

    console.log("✅ PreApproval API Response:", pushRes.data);

    // 8. Final Success Response (New User Created)
    res.status(201).json({
      success: true,
      message: "New user created successfully",
      data: {
        dedupe: dedupeRes.data,
        createUser: pushRes.data,
      },
    });
  } catch (err) {
    // Log the full error for debugging
    console.error(
      "❌ Error in /partner/mpokket:",
      err.message,
      err.response?.data,
    );

    // Error Response
    res.status(500).json({
      success: false,
      message: "❌ Internal Server Error",
      error: err.response?.data || err.message || "An unknown error occurred",
    });
  }
});

module.exports = router;
