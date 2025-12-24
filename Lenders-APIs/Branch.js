// routes/branch.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");
const { saveApiResponse } = require("../utils/saveApiResponse"); // ✅ import helper

// ------------------- Helper Functions -------------------
function getHeader() {
  const token = "d63pdkqwmhkhUqyTT9UsJwPvJOaPFf/H";
  console.log("Using token:", token); // Log the token here
  return {
    "X-BRANCH-API-KEY": token,
    "Content-Type": "application/json",
  };
}

function generateRequestId() {
  return crypto.randomBytes(8).toString("hex");
}

function splitName(fullName) {
  if (!fullName) return { firstName: "NA", lastName: "NA" };
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || "NA",
  };
}

function getStateCode(stateName) {
  if (!stateName) return "NA";

  const stateMapping = {
    "ANDHRA PRADESH": "AP",
    "ARUNACHAL PRADESH": "AR",
    "ASSAM": "AS",
    "BIHAR": "BR",
    "CHHATTISGARH": "CG",
    "GOA": "GA",
    "GUJARAT": "GJ",
    "HARYANA": "HR",
    "HIMACHAL PRADESH": "HP",
    "JHARKHAND": "JH",
    "KARNATAKA": "KA",
    "KERALA": "KL",
    "MADHYA PRADESH": "MP",
    "MAHARASHTRA": "MH",
    "MANIPUR": "MN",
    "MEGHALAYA": "ML",
    "MIZORAM": "MZ",
    "NAGALAND": "NL",
    "ODISHA": "OD",
    "PUNJAB": "PB",
    "RAJASTHAN": "RJ",
    "SIKKIM": "SK",
    "TAMIL NADU": "TN",
    "TELANGANA": "TG",
    "TRIPURA": "TR",
    "UTTAR PRADESH": "UP",
    "UTTARAKHAND": "UK",
    "WEST BENGAL": "WB",
    "DELHI": "DL",
    "JAMMU AND KASHMIR": "JK",
    "LADAKH": "LA",
    "ANDAMAN AND NICOBAR ISLANDS": "AN",
    "CHANDIGARH": "CH",
    "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "DD",
    "LAKSHADWEEP": "LD",
    "PUDUCHERRY": "PY",
  };

  const key = stateName.toUpperCase().trim();
  return stateMapping[key] || key;
}

async function createLead(user) {
  const { firstName, lastName } = splitName(user.name);

  const payload = {
    requestId: generateRequestId(),
    userData: {
      nationalIdNumber: user.pan,
      mobileNumber: user.phone,
      email: user.email,
      firstName,
      lastName: lastName || "NA",
      gender: user.gender,
      dob: user.dob,
      profession: user.employment,
      address: {
        street: user.street || "NA",
        city: user.city || "NA",
        state: getStateCode(user.state),
        pincode: user.pincode,
      },
    },
  };

  try {
    const { data } = await axios.post(
      "https://branch.co/partners/v1/soft_offers",
      payload,
      { headers: getHeader() }
    );
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.response?.data || { reason: err.message } };
  }
}

// ------------------- API Route -------------------
router.post("/branch/create", async (req, res) => {
  const user = req.body;

  if (!user || !user.phone) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required user data." });
  }

  try {
    const result = await createLead(user);

    // ✅ Save API success response
    await saveApiResponse(user.phone, "Branch", result, "success");

    res.json(result);
  } catch (err) {
    console.error("❌ Branch API Error:", err.message);

    // ⚠️ Save API failure response
    await saveApiResponse(
      user.phone,
      "Branch",
      err.message || err,
      "failure",
      "rejected"
    );

    res
      .status(500)
      .json({ success: false, error: err.message || "Unknown error" });
  }
});


module.exports = router;