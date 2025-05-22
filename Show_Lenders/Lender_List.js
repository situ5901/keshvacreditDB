const express = require("express");
const router = express.Router();
const filterLenders = require("../utils/filterLenders");

require("dotenv").config();

router.post("/lenderlist", async (req, res) => {
  try {
    const { dob, income, loan } = req.body;

    if (!dob || !income || !loan) {
      return res
        .status(400)
        .json({ message: "DOB, income, and loan are required." });
    }

    const dobDate = new Date(dob);
    const age = new Date().getFullYear() - dobDate.getFullYear();

    const lenders = await filterLenders(age, income, loan);

    return res.status(200).json({
      message: "Lenders fetched successfully",
      data: lenders,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
