const express = require("express");
const router = express.Router();
const axios = require("axios");
const mongoose = require("mongoose");
//update
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

    const formattedWork = allWork.map((work) => {
      const dateObj = new Date(work.createdAt);

      const date = dateObj.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
      });
      const time = dateObj.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      return {
        name: work.name,
        department: work.department,
        message: work.message,
        createdAt: date,
        time: time,
      };
    });

    res.status(200).json(formattedWork);
  } catch (error) {
    console.log("Error getting Daily Work:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/getUserReport", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const user = await DailyWork.find({
      name: { $regex: name, $options: "i" }, // partial and case-insensitive match
    });

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user report:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
