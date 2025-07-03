const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/user.model"); // Ensure correct path
const Users = require("../models/checkdata"); // Ensure correct path

mongoose.set("strictQuery", true);
const db = mongoose.connection;

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

    const foundUser = await Users.find({
      phone: { $in: phone },
    }).select("phone");

    if (!foundUser || foundUser.length === 0) {
      return res.json({
        data: phone.map((num) => ({ phone: num, status: "Not Duplicate" })),
      });
    }

    const foundNumbers = foundUser.map((user) => user.phone);

    const response = phone.map((num) => ({
      phone: num,
      status: foundNumbers.includes(num) ? "Duplicate" : "Not Duplicate",
    }));

    res.json({ data: response });
  } catch (error) {
    console.error("Error in /check-data", error); // detailed log
    res.status(500).json({ message: "Internal Server Error" });
  }
});
module.exports = router;
