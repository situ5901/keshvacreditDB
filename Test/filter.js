const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const SECOND_DB_URI =
  "mongodb+srv://keshvacredit:Vishal12Meham34Keshva@keshvacredit.ftbuh58.mongodb.net/KeshvaCredit";

const secondaryConnection = mongoose.createConnection(SECOND_DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

secondaryConnection.on("connected", () => {
  console.log("✅ Connected to Secondary MongoDB Cluster");
});

secondaryConnection.on("error", (err) => {
  console.error("❌ Secondary DB Connection Error:", err);
});

const db = secondaryConnection;

router.post("/filterdata", async (req, res) => {
  try {
    let { phone } = req.body;

    if (!Array.isArray(phone) || phone.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of phone numbers",
      });
    }

    const phoneNumbers = phone.map((p) => Number(p)); // match number-type phones

    const results = await db
      .collection("userdb")
      .find(
        { phone: { $in: phoneNumbers } },
        {
          projection: {
            apiResponse: 0,
            RefArr: 0,
          },
        },
      )
      .toArray();

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found for provided phone numbers",
      });
    }

    res.status(200).json({
      success: true,
      totalRecords: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Error fetching user data by phone:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

module.exports = router;
