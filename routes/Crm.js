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

router.get("/get-all-leads", async (req, res) => {
  try {
    const ramfinLeads = await db
      .collection("userdb")
      .find(
        { "apiResponse.message": "Lead created successfully." },
        { projection: { phone: 1, _id: 0 } },
      )
      .toArray();

    const zypeLeads = await db
      .collection("userdb")
      .find(
        {
          "apiResponse.fullResponse.status": "ACCEPT",
        },
        { projection: { phone: 1, _id: 0 } },
      )
      .toArray();

    const ramfinPhones = ramfinLeads.map((lead) => lead.phone);
    const zypePhones = zypeLeads.map((lead) => lead.phone);

    res.status(200).json({
      success: true,
      message: "RamFin Create Leads",
      RamFin: {
        data: ramfinPhones,
        total: ramfinPhones.length,
      },

      Zype: {
        data: zypePhones,
        total: zypePhones.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching leads",
      error: error.message,
    });
  }
});
module.exports = router;
