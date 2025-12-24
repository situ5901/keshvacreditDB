const express = require("express");
const router = express.Router();
const axios = require("axios");
const Partner_id = "Keshvacredit";
const { saveApiResponse } = require("../utils/saveApiResponse"); // ✅ import helper
const API_URL = "https://instantmudra.com/admin/API/Live_instantmudra";

router.get("/partner/instant", async (req, res) => {
  res.send("Hello from instantmudra");
});

router.post("/partner/instant", async (req, res) => {
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

    const requestBody = {
      phone_no: phone,
      email: email,
      full_name: name,
      gender: gender,
      dob: dob,
      pan_card_no: pan,
      employement_type: employment,
      salary: income,
      pin_code: pincode,
      Partner_id: Partner_id,
    };

    console.log("📤 Sending Lead:", JSON.stringify(requestBody, null, 2));

    const apiResponse = await axios.post(API_URL, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "api-key": "d70e2e18685f38708e175d780390d064ke58",
      },
    });

    // ✅ Save success response
    await saveApiResponse(phone, "Instantmudra", apiResponse.data, "success");

    res.status(apiResponse.status).json({
      msg: apiResponse.data.msg,
    });
  } catch (error) {
    console.error("❌ Instant API Error:", error.message);

    // ❌ Save failure response
    await saveApiResponse(
      req.body?.phone || "unknown",
      "Instant",
      error.response?.data || error.message,
      "failure",
      "API call failed"
    );

    res.status(500).json({ success: false, message: error.message });
  }
});


module.exports = router;