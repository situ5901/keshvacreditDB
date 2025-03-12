const express = require("express");
const mongoose = require("mongoose"); // ✅ Mongoose Import Fix
const router = express.Router();
const User = require("../models/user.model.js"); // ✅ User Model Import

// ✅ Flexible Schema
const loopSchema = new mongoose.Schema({}, { strict: false });
const Loop = mongoose.model("loop", loopSchema);

// ✅ POST API to store any data
router.post("/post-data", async (req, res) => {
  try {
    const data = req.body;

    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No data provided" });
    }

    const newData = new Loop(data);
    await newData.save();

    res.status(201).json({ message: "Data saved successfully", data: newData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; // ✅ Fixed Typo
