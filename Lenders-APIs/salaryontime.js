const express = require("express");
const router = express.Router();
const axios = require("axios");
const { saveApiResponse } = require("../utils/saveApiResponse"); // ✅ import helper

const newAPI = "https://marketing.sotcrm.com/affiliates";

router.get("/partner/salaryontime", (req, res) => {
  res.send("Hello from salaryontime");
});

router.post("/partner/salaryontime", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      gender,
      dob,
      pincode,
      income,
      employment,
      pan,
    } = req.body;

    const apiRequestBody = {
      mobile: phone,
      first_name: name,
      last_name: "Kumar", // default fallback
      email: email,
      employment_type: employment,
      pan: pan,
      dob: dob ? new Date(dob).toISOString().split("T")[0] : "1995-08-15",
      pincode: pincode,
      monthly_income: income,
      utm_source: "keshvacredit",
    };

    console.log(
      "📤 Sending to SalaryOnTime:",
      JSON.stringify(apiRequestBody, null, 2),
    );

    const apiResponse = await axios.post(newAPI, apiRequestBody, {
      headers: {
        "Content-Type": "application/json",
        Auth: "ZTI4MTU1MzE4NWQ2MGQyZTFhNWM0NGU3M2UzMmM3MDM=",
        Cookie: "ci_session=3v2hpnl2ifpmp73jsaq30hh632co36vk",
      },
    });

    // ✅ Save API success response
    await saveApiResponse(phone, "SalaryOnTime", apiResponse.data, "success");

    res.status(apiResponse.status).json({
      success: true,
      message: apiResponse.data.message,
      data: apiResponse.data,
    });
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);

    // ❌ Save API failure response
    await saveApiResponse(
      req.body.phone,
      "SalaryOnTime",
      error.response?.data || error.message,
      "failure",
      "rejected ",
    );

    res.status(200).json({
      success: false,
      message:
        error.response?.data?.message ||
        error.response?.data ||
        error.message,
    });
  }
});

module.exports = router;