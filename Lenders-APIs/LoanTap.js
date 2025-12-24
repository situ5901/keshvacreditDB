const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const axios = require("axios");
const { saveApiResponse } = require("../utils/saveApiResponse");

const API_URL = "https://api.loantap.in/v1-application/dist";
const Partner_id = "Keshvacredit";
const partnerKey = "iDWUDj8oljS9XHeHXzsJCGViewdHRUiR";
const iv = Buffer.alloc(16, 0);

//update the partner key and iv

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

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "X-API-AUTH": generateXApiAuth(),
    "REQ-PRODUCT-ID": "lt-personal-term-loan-reducing",
    "PARTNER-ID": "keshvacredit",
  };
}

function convertDobToYYYYMMDD(dob) {
  if (!dob) return null;
  let date = typeof dob === "string" ? new Date(dob) : dob;
  if (!(date instanceof Date) || isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

router.post("/partner/loantap", async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      pan,
      pincode,
      employment,
      income,
      dob,
      state,
      gender,
    } = req.body;

    const requestBody = {
      add_application: {
        job_type: employment?.toLowerCase() || "",
        full_name: name?.toLowerCase() || "",
        personal_email: email?.toLowerCase() || "",
        mobile_number: String(phone),
        dob: convertDobToYYYYMMDD(dob),
        gender: gender?.toLowerCase() || "",
        pan_card: pan,
        home_zipcode: pincode,
        loan_city: state?.toLowerCase() || "",
        fixed_income: income,
        Partner_id: Partner_id,
        consent_given: "yes",
        consent_given_timestamp: new Date()
          .toISOString()
          .replace("T", " ")
          .slice(0, 19),
      },
    };

    const response = await axios.post(API_URL, requestBody, {
      headers: getHeaders(),
    });

    // ✅ Save successful response
    await saveApiResponse(phone, "Loantap", response.data, "success");

    const answer = response.data?.add_application?.answer || {};

    res.json({
      status: answer.status || "unknown",
      message: answer.message || "No message",
      lapp_id: answer.lapp_id || null,
      status_code: answer.status_code || null,
    });
  } catch (error) {
    console.error("❌ LoanTap API Error:", error.response?.data || error.message);

    // ⚠️ Log failure too
    await saveApiResponse(
      req.body.phone,
      "Loantap",
      error.response?.data || error.message,
      "failure",
      "API call failed"
    );

    res.status(500).json({
      status: "failed",
      message: error.response?.data?.message || error.message,
      rawResponse: error.response?.data || null,
    });
  }
});


module.exports = router;