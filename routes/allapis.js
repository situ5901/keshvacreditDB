const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const pLimit = require("p-limit");
require("dotenv").config();
const Users = require("../models/checkdata"); // adjust path if needed

mongoose.set("strictQuery", true);

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

router.post("/check-data", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!Array.isArray(phone) || phone.length === 0) {
      return res.status(400).json({
        message: "Please enter a valid phone number array",
      });
    }

    const phones = phone.map((p) => String(p).trim());
    const BATCH_SIZE = 200;
    const CONCURRENCY = 5;

    const chunks = chunkArray(phones, BATCH_SIZE);
    const duplicateNumbers = new Set();

    const limit = pLimit(CONCURRENCY);

    const tasks = chunks.map((batch, idx) =>
      limit(async () => {
        console.time(`Batch-${idx}`);
        const foundUsers = await Users.find(
          { phone: { $in: batch } },
          { phone: 1 },
        );
        foundUsers.forEach((user) => {
          duplicateNumbers.add(String(user.phone).trim()); // important fix
        });
        console.timeEnd(`Batch-${idx}`);
      }),
    );

    await Promise.all(tasks);

    const response = phones.map((num) => ({
      phone: num,
      status: duplicateNumbers.has(num) ? "Duplicate" : "Not Duplicate",
    }));

    res.json({
      totalRequested: phones.length,
      totalDuplicate: duplicateNumbers.size,
      data: response,
    });
  } catch (error) {
    console.error("❌ Error in /check-data:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

module.exports = router;



