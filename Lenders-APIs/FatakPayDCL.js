const express = require("express");
const router = express.Router();
const axios = require("axios");
const { saveApiResponse } = require("../utils/saveApiResponse"); // ✅ import helper

const TOKEN_API =
  "https://onboardingapi.fatakpay.com/external-api/v1/create-user-token";
const ELIGIBILITY_API =
  "https://onboardingapi.fatakpay.com/external-api/v1/emi-insurance-eligibility";

router.post("/partner/fatakdcl", async (req, res) => {
  try {
    const tokenPayloads = {
      username: "KeshvaCredit",
      password: "a5df9f760eb280c878b4",
    };

    console.log("\n🔑 Generating token...");
    const tokenResponse = await axios.post(TOKEN_API, tokenPayloads, {
      headers: { "Content-Type": "application/json" },
    });

    const token = tokenResponse.data?.data?.token;

    if (!token) {
      console.error("❌ Token not received from API response.");
      return res.status(500).json({
        message: "❌ Failed to retrieve token from Fatakpay API.",
      });
    }

    console.log("✅ Token generated successfully.");

    const {
      phone,
      name,
      last_name,
      employType,
      pancard,
      dob,
      email,
      pincode,
      home_address,
      office_address,
      type_of_residence,
      company_name,
    } = req.body;

    const eligibilityPayload = {
      mobile: phone,
      first_name: name,
      last_name: last_name,
      employment_type_id: employType,
      pan: pancard,
      dob: dob,
      email: email,
      pincode: pincode,
      emp_code: "EMP12345",
      home_address: home_address,
      office_address: office_address,
      type_of_residence: type_of_residence,
      company_name: company_name,
      consent: true,
      consent_timestamp: new Date().toISOString(),
    };

    console.log("🚀 Checking eligibility with payload:", eligibilityPayload);

    const eligibilityResponse = await axios.post(
      ELIGIBILITY_API,
      eligibilityPayload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
      },
    );

    // ✅ Save success response
    await saveApiResponse(phone, "FatakDCL", eligibilityResponse.data, "success");

    console.log("✔️ Eligibility check completed.");

    return res.json({ data: eligibilityResponse.data });
  } catch (err) {
    console.error("❌ API Error:", err.message);

    // ❌ Save failure response
    await saveApiResponse(
      req.body?.phone || "unknown",
      "FatakDCL",
      err.response?.data || err.message,
      "failure",
      "API call failed"
    );

    return res.status(500).json({
      status: false,
      message: "An error occurred during the API process.",
      error: err.response ? err.response.data : err.message,
    });
  }
});


module.exports = router;