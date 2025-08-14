const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const pLimit = require("p-limit");
require("dotenv").config();
const Users = require("../models/checkdata"); // adjust path if needed
const Member = require("../models/infiSchema");
mongoose.set("strictQuery", true);

// ✅ Helper: chunk array
function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}



// -------------------------
// 1️⃣ Check duplicates API
// -------------------------
router.post("/check-data", async (req, res) => {
  try {
    const { phone, pan } = req.body;

    if (
      (!Array.isArray(phone) || phone.length === 0) &&
      (!Array.isArray(pan) || pan.length === 0)
    ) {
      return res.status(400).json({
        message: "Please enter a valid phone or PAN array",
      });
    }

    const phones = (phone || []).map((p) => String(p).trim());
    const pans = (pan || []).map((p) => String(p).trim().toUpperCase());

    const BATCH_SIZE = 200;
    const CONCURRENCY = 5;

    const chunks = chunkArray(
      [...phones, ...pans], // combined for batching
      BATCH_SIZE
    );

    const duplicatePhones = new Set();
    const duplicatePans = new Set();

    const limit = pLimit(CONCURRENCY);

    const tasks = chunks.map((batch, idx) =>
      limit(async () => {
        console.time(`Batch-${idx}`);
        const foundUsers = await Users.find(
          {
            $or: [
              { phone: { $in: batch } },
              { pan: { $in: batch.map((p) => p.toUpperCase()) } },
            ],
          },
          { phone: 1, pan: 1 }
        );

        foundUsers.forEach((user) => {
          if (user.phone) duplicatePhones.add(String(user.phone).trim());
          if (user.pan) duplicatePans.add(String(user.pan).trim().toUpperCase());
        });
        console.timeEnd(`Batch-${idx}`);
      })
    );

    await Promise.all(tasks);

    const response = {
      phone: phones.map((num) => ({
        phone: num,
        status: duplicatePhones.has(num) ? "Duplicate" : "Not Duplicate",
      })),
      pan: pans.map((num) => ({
        pan: num,
        status: duplicatePans.has(num) ? "Duplicate" : "Not Duplicate",
      })),
    };

    res.json({
      totalPhonesChecked: phones.length,
      totalDuplicatePhones: duplicatePhones.size,
      totalPansChecked: pans.length,
      totalDuplicatePans: duplicatePans.size,
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


// -------------------------
// 2️⃣ Insert API with phone & PAN check
// -------------------------
router.post("/infiSchema", async (req, res) => {
  try {
    const data = req.body;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: "Empty data." });
    }

    // ✅ Request-level duplicate check (phone or pan)
    const uniqueData = data.filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            String(t.phone).trim() === String(item.phone).trim() ||
            (t.pan &&
              item.pan &&
              t.pan.toUpperCase().trim() === item.pan.toUpperCase().trim())
        )
    );

    if (uniqueData.length !== data.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate phone or PAN in request.",
      });
    }

    // ✅ DB check
    const existing = await Member.find({
      $or: uniqueData.flatMap((item) => {
        const orArr = [];
        if (item.phone) orArr.push({ phone: String(item.phone).trim() });
        if (item.pan)
          orArr.push({ pan: String(item.pan).trim().toUpperCase() });
        return orArr;
      }),
    });

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Phone or PAN already exists in DB.",
      });
    }

    // ✅ Insert if everything passes
    const saved = await Member.insertMany(uniqueData, { ordered: false });
    res.status(200).json({ success: true, message: `${saved.length} saved.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
module.exports = router;
