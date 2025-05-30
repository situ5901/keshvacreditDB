const express = require("express");
const router = express.Router();
const axios = require("axios");
const mongoose = require("mongoose");

const dailyWorkSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

const DailyWork = mongoose.model("dailyWork", dailyWorkSchema);

router.post("/dailyRepost", async (req, res) => {
  try {
    const { name, department, message } = req.body;

    if (!name || !department || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newWork = new DailyWork({
      name,
      department,
      message,
    });

    await newWork.save();
    res.status(200).json({ message: "Daily work saved successfully" });
  } catch (error) {
    console.error("Error saving daily work:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/getDailyReport", async (req, res) => {
  try {
    const allWork = await DailyWork.find();
    res.status(200).json(allWork);
  } catch (error) {
    console.log("Error getting Daily Work:", error);
    res.status(500).json({ message: "Iinternal Server Error" });
  }
});

module.exports = router;
