const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const pLimit = require("p-limit");
require("dotenv").config();
const Users = require("../models/checkdata");
const Member = require("../models/infiSchema");
mongoose.set("strictQuery", true);

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// ✅ API 1: Check Data by Phone in Both Collections
router.post("/check-data", async (req, res) => {
  try {
    const { phone = [] } = req.body;

    if (!Array.isArray(phone) || phone.length === 0) {
      return res.status(400).json({
        message: "Please enter a valid phone number array",
      });
    }

    const phones = phone.map((p) => String(p).trim());
    const BATCH_SIZE = 200;
    const CONCURRENCY = 5;
    const limit = pLimit(CONCURRENCY);
    const duplicatePhones = new Set();

    const phoneChunks = chunkArray(phones, BATCH_SIZE);
    const phoneTasks = phoneChunks.map((batch, idx) =>
      limit(async () => {
        console.time(`Phone-Batch-${idx}`);
        const [usersFound, membersFound] = await Promise.all([
          Users.find({ phone: { $in: batch } }, { phone: 1 }),
          Member.find({ phone: { $in: batch } }, { phone: 1 }),
        ]);
        [...usersFound, ...membersFound].forEach((doc) => {
          duplicatePhones.add(String(doc.phone).trim());
        });
        console.timeEnd(`Phone-Batch-${idx}`);
      }),
    );

    await Promise.all(phoneTasks);

    res.json({
      totalPhoneRequested: phones.length,
      totalPhoneDuplicate: duplicatePhones.size,
      phoneData: phones.map((num) => ({
        phone: num,
        status: duplicatePhones.has(num) ? "Duplicate" : "Not Duplicate",
      })),
    });
  } catch (error) {
    console.error("❌ Error in /check-data:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

router.post("/infiSchema", async (req, res) => {
  try {
    const data = req.body; // Request body se data

    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid data",
      });
    }

    const savedMember = await Member.create(data);

    return res.status(201).json({
      success: true,
      message: "Data saved successfully",
      data: savedMember,
    });
  } catch (error) {
    console.error("❌ Error in /infiSchema:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

module.exports = router;
