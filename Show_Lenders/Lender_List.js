const express = require("express");
const router = express.Router();
const filterLenders = require("../utils/filterLenders");
const BLfilterLenders = require("../utils/filterbl.js");
const User = require("../models/user.model"); // Ensure correct path
const BLSchema = require("../routes/BL/BLSchema.js");
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

    // calculate age
    const dobDate = new Date(user.dob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dobDate.getDate())
    ) {
      age--;
    }

    const income = user.income;
    const loanAmount = user.loanAmount;
    const employment = user.employment || "";
    const pincode = user.pincode?.toString().trim(); // ✅ include pincode

    if (!dobDate || !income || !loanAmount || !pincode) {
      return res.status(400).json({ message: "User data incomplete." });
    }

    const lenders = await filterLenders(
      age,
      income,
      loanAmount,
      employment,
      pincode,
    );

    return res.status(200).json({
      message: "Fetch Eligible Lenders",
      data: lenders,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("BL/lenderlist", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required." });
    }

    const user = await BLSchema.findOne({ phone: phone });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // calculate age
    const dobDate = new Date(user.dob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dobDate.getDate())
    ) {
      age--;
    }

    const Gst = user.gstRegistered;
    const loanAmount = user.loanAmount;
    const employment = user.employment || "";
    const pincode = user.pincode?.toString().trim(); // ✅ include pincode

    if (!dobDate || !income || !loanAmount || !pincode) {
      return res.status(400).json({ message: "User data incomplete." });
    }

    const lenders = await BLfilterLenders(
      age,
      Gst,
      loanAmount,
      employment,
      pincode,
    );

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
