const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();
const UserDB = require("../routes/BL/BLSchema");

const router = express.Router();

// 🔗 Faircent Config
const BASE_URL = "https://api.faircent.com";
const APP_ID = "1cfa78742af22b054a57fac6cf830699";
const APP_NAME = "KESHVACREDIT";

// 📌 Lead API Route
router.post("/faircent/lead", async (req, res) => {
  try {
    const { payload } = req.body;

    if (!payload || !payload.phone) {
      return res.status(400).json({
        success: false,
        message: "payload with phone is required",
      });
    }

    // 🔑 Extract dedupe fields
    const dedupePayload = {
      pan: payload.pan,
      email: payload.email || payload.mail, // handle both keys if user sends "mail"
      phone: payload.phone,
    };

    // 1️⃣ Dedupe check
    const dedupeResponse = await axios.post(
      `${BASE_URL}/duplicatecheck`,
      dedupePayload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
        },
      },
    );

    // 2️⃣ Lead create
    const leadCreateResponse = await axios.post(
      `${BASE_URL}/aggregrator/register/user`,
      payload, // full payload goes here
      {
        headers: {
          "Content-Type": "application/json",
          "x-application-id": APP_ID,
          "x-application-name": APP_NAME,
        },
      },
    );

    // 3️⃣ Update user in DB
    const updateDoc = {
      $set: {
        ...payload, // ✅ save user’s full payload
        updatedAt: new Date().toISOString(),
      },
      $push: {
        apiResponse: {
          Faircent: {
            dedupe: dedupeResponse.data,
            lead: leadCreateResponse.data,
          },
          createdAt: new Date().toISOString(),
        },
      },
    };

    const updatedUser = await UserDB.findOneAndUpdate(
      { phone: payload.phone }, // match phone
      updateDoc,
      { new: true, upsert: true },
    );

    res.json({
      success: true,
      message: "Faircent dedupe + lead response updated & user saved",
      dedupe: dedupeResponse.data,
      lead: leadCreateResponse.data,
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "❌ Faircent Lead API Error:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      success: false,
      message: "Something went wrong with Faircent lead API",
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;
