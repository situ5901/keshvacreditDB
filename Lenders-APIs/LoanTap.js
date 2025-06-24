const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");

const partnerKey = "iDWUDj8oljS9XHeHXzsJCGViewdHRUiR"; // must be 32 chars
const iv = Buffer.alloc(16, 0);
const Partner_id = "Keshvacredit";
const API_URL = "https://loantap.in/v1-application/transact";

// 🔐 Generate AES-256 encrypted epoch timestamp
function generateXApiAuth() {
  const epochSeconds = Math.floor(Date.now() / 1000).toString();
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(partnerKey, "utf8"),
    iv,
  );
  let encrypted = cipher.update(epochSeconds, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

// 📦 Prepare API headers
function getHeaders() {
  return {
    "Content-Type": "application/json",
    "X-API-AUTH": generateXApiAuth(),
    "REQ-PRODUCT-ID": "lt-personal-term-loan-reducing",
    "PARTNER-ID": "keshvacredit",
  };
}

// 📅 Format DOB to YYYYMMDD
function convertDobToYYYYMMDD(dob) {
  if (!dob) return null;
  let date = typeof dob === "string" ? new Date(dob) : dob;
  if (!(date instanceof Date) || isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

// ✅ GET route (health check)
router.get("/partner/LoanTap", (req, res) => {
  res.send("✅ LoanTap API is active");
});

// ✅ POST route to send data to LoanTap
router.post("/partner/LoanTap", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      pan,
      income,
      employment,
      dob,
      gender,
      pincode,
      state,
    } = req.body;

    if (!name || !email || !phone || !pan || !income || !employment || !dob) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const applicant = {
      job_type: employment.toLowerCase(),
      full_name: name.toLowerCase(),
      personal_email: email.toLowerCase(),
      mobile_number: String(phone),
      dob: convertDobToYYYYMMDD(dob),
      gender: gender?.toLowerCase() || "",
      pan_card: pan,
      home_zipcode: pincode || "",
      loan_city: state?.toLowerCase() || "delhi",
      fixed_income: income,
      Partner_id: Partner_id,
      consent_given: "yes",
      consent_given_timestamp: new Date()
        .toISOString()
        .replace("T", " ")
        .slice(0, 19),
    };

    const response = await axios.post(API_URL, applicant, {
      headers: getHeaders(),
    });

    return {
      response: response.status,
      response: response.data,
      rawResponse: response.data,
    };
  } catch (error) {
    console.error(
      "❌ LoanTap API Error:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;
