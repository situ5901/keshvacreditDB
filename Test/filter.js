const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
require("dotenv").config();

mongoose.set("strictQuery", true);

router.post("/filterdata", async (req, res) => {
  let { phones } = req.body;

  if (
    !Array.isArray(phones) ||
    !phones.length ||
    phones.some((p) => isNaN(p))
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid phone number array is required",
    });
  }

  phones = phones.map((p) => Number(p));

  try {
    const results = await mongoose.connection
      .collection("userdb")
      .find(
        { phone: { $in: phones } },
        { projection: { RefArr: 0, apiResponse: 0 } },
      )
      .toArray();

    if (!results.length) {
      return res.status(404).json({
        success: false,
        message: "No data found for the provided phone numbers",
      });
    }

    res.status(200).json({
      success: true,
      totalRecords: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

module.exports = router;
