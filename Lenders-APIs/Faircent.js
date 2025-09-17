const express = require("express");
const router = express.Router();
const axios = require("axios");

const BASE_URL = "https://fcnode5.faircent.com/v1/api";
const APP_ID = "b27b11e13af255ef90f7c1939dcab2d2";
const APP_NAME = "KESHVACREDIT";

/**
 * STEP 1 & 2: Duplicate Check + Register User
 */
router.post("/faircent/lead", async (req, res) => {
  try {
    const { payload } = req.body;

    if (!payload) {
      return res.status(400).json({
        success: false,
        message: "Payload is required",
      });
    }

    // 1️⃣ Duplicate Check
    const dupRes = await axios.post(`${BASE_URL}/duplicateCheck`, payload, {
      headers: {
        "x-application-id": APP_ID,
        "x-application-name": APP_NAME,
        "Content-Type": "application/json",
      },
    });

    if (!dupRes.data || dupRes.data?.success === false) {
      return res.status(400).json({
        success: false,
        message: "Duplicate check failed",
        data: dupRes.data,
      });
    }

    // 2️⃣ Register User
    const regRes = await axios.post(
      `${BASE_URL}/aggregrator/register/user`,
      payload,
      {
        headers: {
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
          "Content-Type": "application/json",
        },
      },
    );

    const result = regRes.data?.result || {};

    if (!regRes.data.success || result.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Registration failed or not approved",
        data: regRes.data,
      });
    }

    // ✅ Success → Return token + loan_id for next step
    return res.status(200).json({
      success: true,
      message: "Duplicate check + Register successful",
      data: {
        loan_id: result.loan_id || null,
        token: result.token || null,
      },
    });
  } catch (err) {
    console.error(
      "❌ Faircent Lead API Error:",
      err.response?.data || err.message,
    );
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
