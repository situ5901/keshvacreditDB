const express = require("express");
const router = express.Router();
const axios = require("axios");

const APIURL = "https://api.loan112fintech.com/marketing-push-lead-data";

async function GetHeader() {
  return {
    Username: "KESHVACREDIT_LOAN112_20260130",
    Auth: "a2945757d8e7aa55dd2d7c6888ca65e77c6c4c6c",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// Added async here
router.post("/keshva/loan112", async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      pan,
      pincode,
      income,
      dob,
      income_type,
      gender,
      next_salary_date,
      company_name,
    } = req.body;

    const Payload = {
      full_name: name || "",
      mobile: phone || "",
      email: email || "",
      pancard: pan || "",
      pincode: pincode || "",
      monthly_salary: income || 0,
      income_type: income_type,
      dob: dob || "",
      gender: gender || "",
      next_salary_date: next_salary_date || "2026-02-07",
      company_name: company_name || " ",
    };

    const Loan112Apis = await axios.post(APIURL, Payload, {
      headers: GetHeader(),
    });
    return res.status(200).json(Loan112Apis.data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
