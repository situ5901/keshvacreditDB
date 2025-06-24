const express = require("express");
const router = express.Router();
const axios = require("axios");
const Partner_id = "Keshvacredit";
const API_URL = "https://instantmudra.com/admin/API/new_API_instantmudra";

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
      },
    });

    res.status(apiResponse.status).json({
      msg: apiResponse.data.msg,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
