// routes/partner.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const xlsx = require("xlsx");
const path = require("path");
require("dotenv").config();
//upda
const TOKEN_API_URL = "https://vnotificationgw.epifi.in/v1/auth/token";
const LEAD_API_URL = "https://vnotificationgw.epifi.in/v1/leads/loans/create";
const REF_NAME = "PI";
const MIN_INCOME = 25000; // minimum eligible income

// Load valid pincodes from Excel
const PINCODE_FILE_PATH = path.join(__dirname, "..", "xlsx", "FI_pincode.xlsx");
let validPincodes = new Set();

function loadValidPincodes() {
  try {
    const workbook = xlsx.readFile(PINCODE_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    data.forEach((row) => {
      if (row[0]) validPincodes.add(String(row[0]).trim());
    });
    console.log(`✅ Loaded ${validPincodes.size} valid pincodes.`);
  } catch (err) {
    console.error("❌ Error loading pincode file:", err.message);
  }
}
loadValidPincodes();

// Function to get auth token
async function getAuthToken() {
  try {
    const payload = {
      client_id: "keshvacredit",
      client_secret: "usH-ew;mcv5lk7<4",
    };
    const { data } = await axios.post(TOKEN_API_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return data?.auth_token || data?.data?.auth_token;
  } catch (err) {
    console.error(
      "❌ Error fetching token:",
      err.response?.data || err.message,
    );
    throw new Error(err.response?.data?.message || "Failed to get auth token");
  }
}

// Helper to format date
function formatDate(dob) {
  const date = new Date(dob);
  if (isNaN(date)) return null;
  return date.toISOString().split("T")[0];
}

// Build payload for PI
function buildPayload(user) {
  const fullName = user.name ? user.name.trim() : "";
  let firstName = "";
  let lastName = "";

  if (fullName === "") lastName = "Sharma";
  else {
    const nameParts = fullName.split(" ");
    if (nameParts.length === 1) {
      firstName = nameParts[0];
      lastName = "Sharma";
    } else {
      firstName = nameParts.shift();
      lastName = nameParts.join(" ");
    }
  }

  return {
    client_request_id: `REQ${Date.now()}${Math.floor(Math.random() * 1000)}`,
    name: { first: firstName, last: lastName },
    phone_number: String(user.phone),
    email: user.email,
    pan: user.pan,
    dob: formatDate(user.dob),
    current_address: { pincode: String(user.pincode) },
    employment_details: {
      employment_type: ["SALARIED", "SELF_EMPLOYED"].includes(
        (user.employment || "").toUpperCase(),
      )
        ? user.employment.toUpperCase()
        : "SALARIED",
      monthly_income: String(user.income || "0"),
    },
    loan_requirement: {
      desired_loan_amount: String(user.desired_loan_amount || 350000),
    },
    custom_fields: {
      utm_source: "google_ads",
      agent_code: "AGT777",
      ref_campaign: "monsoon-offer-2025",
    },
    evaluation_type: "BASIC",
  };
}

// API route
router.post("/partner/pi", async (req, res) => {
  const user = req.body;

  if (!user || !user.phone) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required user data." });
  }

  // Income validation
  if (Number(user.income || 0) < MIN_INCOME) {
    return res.status(400).json({
      success: false,
      message: `Income ₹${user.income} is below minimum eligibility ₹${MIN_INCOME}`,
    });
  }

  // Pincode validation
  if (!validPincodes.has(String(user.pincode).trim())) {
    return res.status(400).json({
      success: false,
      message: `Pincode ${user.pincode} is not valid.`,
    });
  }

  try {
    const token = await getAuthToken();
    const payload = buildPayload(user);
    console.log("📤 Sending Payload:", payload);

    const { data } = await axios.post(LEAD_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ PI API Response:", JSON.stringify(data, null, 2));

    return res.json({ success: true, data });
  } catch (err) {
    console.error(
      "📥 PI API Response Error:",
      JSON.stringify(err.response?.data, null, 2) || err.message,
    );
    return res.status(500).json({
      success: false,
      error: { message: err.response?.data?.message || err.message },
    });
  }
});

module.exports = router;
