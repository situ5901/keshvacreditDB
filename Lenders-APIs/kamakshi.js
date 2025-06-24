const express = require("express");
const router = express.Router();
const axios = require("axios");

const newAPI =
  "https://kamakshimoney.com/loanapply/kamakshimoney_api/lead_gen/api/v1/create_lead";
const Partner_id = "Keshvacredit"; // Add your Partner ID here

router.get("/partner/kamakshi", async (req, res) => {
  res.send("Hello from Kamakshi");
});

router.post("/partner/kamakshi", async (req, res) => {
  try {
    const { name, email, phone, pan, loanAmount, employment, dob } = req.body;

    const formattedDob = new Date(dob).toISOString().split("T")[0]; // e.g., 1995-08-20

    const apiRequestBody = {
      mobile: phone,
      name: name,
      email: email,
      employeeType: employment,
      dob: formattedDob,
      pancard: pan,
      loanAmount: loanAmount,
      Partner_id: Partner_id,
    };

    console.log("Sending to Kamakshi API:", apiRequestBody);

    const response = await axios.post(newAPI, apiRequestBody, {
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic cmFtZmluX2U2NmIxNmE5ZjZiNzQ5YTAzOTBmZWRjM2U4ZjNkZjZmOmI3YjJlZDU1MjM5NjA5NzM5NmQwOWE2N2RkZTI4NjUyMDNjZDMxYjA=",
      },
    });

    res.json({
      data: response.data,
    });
  } catch (error) {
    res.status(409).json({
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;
