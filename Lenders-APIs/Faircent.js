const express = require("express");
const router = express.Router();
const axios = require("axios");

// Production credentials and base URL provided by the user.
// The document you provided stated these were "On Request," but you have provided them now.
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

    // The endpoint is /aggregrator/register/user as per the document.
    const leadRes = await axios.post(
      `${BASE_URL}/aggregrator/register/user`,
      payload,
      {
        headers: {
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
          "Content-Type": "application/json",
        },
      }
    );

    const leadData = leadRes.data;

    // Check if the response indicates success
    // The API returns "success": true for successful registration.
    if (leadData?.success === true) {
      return res.status(200).json({
        success: true,
        message: leadData?.message || "Lead registration successful",
        data: leadData,
      });
    } else {
      // If registration fails, return the error message from the API.
      return res.status(400).json({
        success: false,
        message: leadData?.message || "Lead registration failed",
        data: leadData,
      });
    }
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
