const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
require("dotenv").config();

mongoose.set("strictQuery", true);
const db = mongoose.connection;

router.get("/get-all-leads", async (req, res) => {
  try {
    const ramfinLeads = await db
      .collection("userdb")
      .find(
        { "apiResponse.message": "Success" },
        { projection: { phone: 1, _id: 0 } },
      )
      .toArray();

    const zypeLeads = await db
      .collection("userdb")
      .find(
        { "apiResponse.ZypeResponse.status": "ACCEPT" },
        { projection: { phone: 1, _id: 0 } },
      )
      .toArray();

    const fatakPayLeads = await db
      .collection("userdb")
      .find(
        { "apiResponse.message": "You are eligible." },
        { projection: { phone: 1, _id: 0 } },
      )
      .toArray();

    const ramfinPhones = ramfinLeads.map((lead) => lead.phone);
    const zypePhones = zypeLeads.map((lead) => lead.phone);
    const fatakPayPhones = fatakPayLeads.map((lead) => lead.phone);

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
      FatakPayPL: {
        data: fatakPayPhones,
        total: fatakPayPhones.length,
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
