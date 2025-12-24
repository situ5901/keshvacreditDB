const express = require("express");
const router = express.Router();
const axios = require("axios");

const BASE_URL = "https://backend.creditsea.com/api/v1";
const ENDPOINT = "leads/create-lead-dsa";
const SOURCE_ID = "77445946";

router.post("/creditsea", async (req, res) => {
  try {
    const {
      name,
      last_name,
      phone,
      pan,
      dob,
      gender,
      pincode,
      income,
      employment,
    } = req.body;

    const data = {
      first_name: name,
      last_name: last_name || ".",
      phoneNumber: String(phone),
      pan,
      dob,
      gender: gender?.toLowerCase(),
      pinCode: pincode,
      income: String(income),
      partner_Id: "KeshvaCredit",
      employmentType: employment,
    };

    const response = await axios.post(`${BASE_URL}/${ENDPOINT}`, data, {
      headers: {
        "Content-Type": "application/json",
        sourceid: SOURCE_ID,
      },
    });

    return res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "🚫 CreditSea API Error:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;
