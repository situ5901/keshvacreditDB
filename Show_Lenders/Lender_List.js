const express = require("express");
const router = express.Router();
const filterLenders = require("../utils/filterLenders");
const User = require("../models/user.model"); // Ensure correct path

require("dotenv").config();

router.post("/lenderlist", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required." });
    }

    const user = await User.findOne({ phone: phone });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const dobDate = new Date(user.dob);
    const age = new Date().getFullYear() - dobDate.getFullYear();
    const income = user.income;
    const loanAmount = user.loanAmount;

    if (!dobDate || !income || !loanAmount) {
      return res.status(400).json({ message: "User data incomplete." });
    }

    const lenders = await filterLenders(age, income, loanAmount);

    return res.status(200).json({
      message: "Fetch Eligible Lenders",
      data: lenders,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
