const express = require("express");
const router = express.Router();
const axios = require("axios");

const TOKEN_API =
  "https://onboardingapi.fatakpay.com/external-api/v1/create-user-token";
const ELIGIBILITY_API =
  "https://onboardingapi.fatakpay.com/external-api/v1/emi-insurance-eligibility";

router.post("/partner/fatakpl", async (req, res) => {
  return res
    .status(200)
    .json({ staus: true, message: "Health is running fine" });
});

module.exports = router;
