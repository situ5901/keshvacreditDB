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

    const dedupePayload = {
      pan: payload.pan,
      email: payload.email, // handle both keys if user sends "mail"
      mobile: payload.phone,
    };

    // Step 1: Duplicate Check
    const dedupeRes = await axios.post(
      `${BASE_URL}/duplicateCheck`,
      dedupePayload,
      {
        headers: {
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
          "Content-Type": "application/json",
        },
      },
    );

    // If duplicate check fails, return actual API response
    if (!dedupeRes.data?.success || dedupeRes.data?.result?.status === false) {
      return res.status(400).json({
        success: false,
        message:
          dedupeRes.data?.result?.message ||
          dedupeRes.data?.message ||
          "Duplicate check failed",
        data: {
          dedupe: dedupeRes.data,
          lead: null,
        },
      });
    }

    // Step 2: Register User
    const leadRes = await axios.post(
      `${BASE_URL}/aggregator/register/user`,
      payload,
      {
        headers: {
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
          "Content-Type": "application/json",
        },
      },
    );

    const leadResult = leadRes.data?.result || {};

    // If lead registration fails, return actual API response
    if (!leadRes.data?.success || leadResult?.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message:
          leadRes.data?.message ||
          leadResult?.message ||
          "Lead registration failed",
        data: {
          dedupe: dedupeRes.data,
          lead: leadRes.data,
        },
      });
    }

    // Both successful → Return combined API responses
    return res.status(200).json({
      success: true,
      message:
        leadRes.data?.message || leadResult?.message || "Both APIs successful",
      data: {
        dedupe: dedupeRes.data,
        lead: leadRes.data,
      },
    });
  } catch (err) {
    console.error(
      "❌ Faircent Lead API Error:",
      err.response?.data || err.message,
    );
    return res.status(500).json({
      success: false,
      message:
        err.response?.data?.message || err.message || "Internal Server Error",
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
