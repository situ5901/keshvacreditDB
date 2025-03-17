const express = require("express");
const mongoose = require("mongoose"); 
const router = express.Router();
const User = require("../models/user.model.js"); 

// ✅ Flexible Schema
const loopSchema = new mongoose.Schema({}, { strict: false });
const Loop = mongoose.model("loop", loopSchema);

// ✅ POST API to store any data
router.post("/post-data", async (req, res) => {
  try {
    console.log("🔹 Received Data:", req.body);

    // ✅ Check if request body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log("🚫 No Data Provided");
      return res.status(400).json({ 
        status: "failed",
        message: "No data provided" 
      });
    }

    // ✅ Save data to MongoDB
    const newData = new Loop(req.body);
    await newData.save();

    console.log("✅ Data Saved:", newData);
    res.status(201).json({ 
      status: "success",
      message: "Lead created successfully",
      data: newData 
    });

  } catch (error) {
    console.error("🚫 Error Saving Data:", error);
    res.status(500).json({ 
      status: "error",
      message: error.message || "Internal Server Error"
    });
  }
});

module.exports = router; // ✅ Export Router
