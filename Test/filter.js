const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
require("dotenv").config();

mongoose.set("strictQuery", true);

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

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

  const BATCH_SIZE = 200;
  const chunks = chunkArray(phones, BATCH_SIZE);
  const allResults = [];

  try {
    for (const batch of chunks) {
      const results = await mongoose.connection
        .collection("userdb")
        .find(
          { phone: { $in: batch } },
          { projection: { RefArr: 0, apiResponse: 0 } },
        )
        .toArray();

      allResults.push(...results);
    }

    if (!allResults.length) {
      return res.status(404).json({
        success: false,
        message: "No data found for the provided phone numbers",
      });
    }

    res.status(200).json({
      success: true,
      totalRecords: allResults.length,
      data: allResults,
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
