const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/user.model");
const Users = require("../models/checkdata");

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
    let { phone } = req.body;

    if (!Array.isArray(phone)) {
      return res
        .status(400)
        .json({ message: "Please send an array of phone numbers" });
    }

    const phoneStrings = phone.map((p) => p.toString());

    // check in User collection
    const foundUsers = await User.find({
      phone: { $in: phoneStrings },
    }).select("phone");

    // check in Users collection (from checkdata.js)
    const foundUsersSecond = await Users.find({
      phone: { $in: phoneStrings },
    }).select("phone");

    // merge results
    const foundNumbers = [
      ...foundUsers.map((u) => u.phone),
      ...foundUsersSecond.map((u) => u.phone),
    ];

    // remove duplicates if same number exists in both
    const uniqueFoundNumbers = [...new Set(foundNumbers)];

    // build response
    const response = phoneStrings.map((num) => ({
      phone: num,
      status: uniqueFoundNumbers.includes(num) ? "Duplicate" : "Not Duplicate",
    }));

    res.json({ data: response });
  } catch (error) {
    console.error("Error checking phone data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
module.exports = router;
