const express = require("express");
const router = express.Router();
const axios = require("axios");

const BASE_URL = "https://api.faircent.com/v1/api";
const APP_ID = "1cfa78742af22b054a57fac6cf830699";
const APP_NAME = "KESHVACREDIT";

router.post("/faircent/lead", async (req, res) => {
  try {
    const { payload } = req.body;

    if (!payload) {
      return res.status(400).json({
        success: false,
        message: "Payload is required",
      });
    }

    // Register User (Lead API)
    const leadRes = await axios.post(
      `${BASE_URL}/aggregator/register/user`,
      payload,
      {
        headers: {
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
          "Content-Type": "application/json",
        },
      }
    );

    const leadResult = leadRes.data?.result || {};

    // If registration fails
    if (!leadRes.data?.success || leadResult?.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message: leadRes.data?.message || leadResult?.message || "Lead registration failed",
        data: leadRes.data,
      });
    }

    // Registration successful
    return res.status(200).json({
      success: true,
      message: leadRes.data?.message || leadResult?.message || "Lead registration successful",
      data: leadRes.data,
    });
  } catch (err) {
    console.error("❌ Faircent Lead API Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.message || "Internal Server Error",
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
