const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/user.model"); // Ensure correct path
const Users = require("../models/checkdata"); // Ensure correct path

mongoose.set("strictQuery", true);
const db = mongoose.connection;
function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}
router.get("/get-all", async (req, res) => {
  try {
    const ramfinLeads = await db
      .collection("userdb")
      .find(
        {
          "apiResponse.RamFin.status": "1",
          "apiResponse.RamFin.message": "Success",
        },
        {
          projection: { phone: 1, _id: 0 },
        },
      )
      .toArray();

    const zypeLeads = await db
      .collection("userdb")
      .find(
        { "apiResponse.fullResponse.status": "ACCEPT" },
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

router.get("/Test", async (req, res) => {
  res.send("Hello CRM");
});

router.post("/check-data", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!Array.isArray(phone)) {
      return res.status(400).json({ message: "Please enter a number array" });
    }

    const phones = phone.map((p) => Number(p)); // Ensure number format
    const BATCH_SIZE = 200;
    const chunks = chunkArray(phones, BATCH_SIZE);
    const duplicateNumbers = new Set();

    // Batch find to avoid memory overload
    for (const batch of chunks) {
      const foundUsers = await Users.find({
        phone: { $in: batch },
      }).select("phone");

      foundUsers.forEach((user) => duplicateNumbers.add(user.phone));
    }

    const response = phones.map((num) => ({
      phone: num,
      status: duplicateNumbers.has(num) ? "Duplicate" : "Not Duplicate",
    }));

    res.json({ data: response });
  } catch (error) {
    console.error("Error in /check-data", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
module.exports = router;
