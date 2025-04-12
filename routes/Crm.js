const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
require("dotenv").config();

mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const db = mongoose.connection;

router.get('/get-ramfin-leads', async (req, res) => {
  try {
    const successfulLeads = await db.collection('userdb').find({
      "apiResponse.message": "Lead created successfully."
    }, {
      projection: { phone: 1, _id: 0 }  
    }).toArray();

    const phoneNumbers = successfulLeads.map(lead => lead.phone);
    const count = phoneNumbers.length;

    res.status(200).json({
      success: true,
      Partner: 'RamFin',
      data: phoneNumbers,
      count: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching leads',
      error: error.message
    });
  }
});

module.exports = router;
