const express = require("express");
const axios = require("axios");
const router = express.Router();
const WebUserDB = require("../models/user.model");

const CreateUserAPI = "https://www.chintamanifinlease.com/api/dsa_live_data";
const Partner_id = "Keshvacredit";

router.post("/partner/chintamani", async (req, res) => {
  console.log("Start APIs");
  try {
    const {
      name,
      phone,
      email,
      pan,
      pincode,
      employment,
      income,
      loanAmount,
      dob,
      gender,
    } = req.body;

    console.log("➡️ Incoming Request Body:", req.body);

    const requestBody = {
      mobile_number: phone,
      email_id: email,
      fname: name,
      current_pincode: pincode,
      d_o_b: dob,
      gender: gender || "Male",
      monthly_income: income,
      Partner_id: Partner_id,
    };

    const hitApi = await axios.post(CreateUserAPI, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "api-key": "d70e2e18685f38708e175d780390d064",
      },
    });

    // ✅ Check Chintamani response
    // if (hitApi.data?.status === true) {
    //   await WebUserDB.updateOne({ phone }, { $set: { chintamani: true } });
    // }

    return res.status(200).json({
      apiResponse: hitApi.data,
    });
  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({
      success: false,
      message: "❌ Internal Server Error",
      error: err.message || err,
    });
  }
});

module.exports = router;
