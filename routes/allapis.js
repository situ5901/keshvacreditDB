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

router.post("/check-data", async (req, res) => {
  try {
    const { phone = [], pan = [] } = req.body;

    if (
      (!Array.isArray(phone) || phone.length === 0) &&
      (!Array.isArray(pan) || pan.length === 0)
    ) {
      return res.status(400).json({
        message: "Please enter a valid phone or PAN array",
      });
    }

    const phones = phone.map((p) => String(p).trim());
    const pans = pan.map((p) => String(p).trim().toUpperCase());
    const BATCH_SIZE = 200;
    const CONCURRENCY = 5;
    const limit = pLimit(CONCURRENCY);

    const duplicatePhones = new Set();
    const duplicatePans = new Set();

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

    const panChunks = chunkArray(pans, BATCH_SIZE);
    const panTasks = panChunks.map((batch, idx) =>
      limit(async () => {
        console.time(`PAN-Batch-${idx}`);
        const [usersFound, membersFound] = await Promise.all([
          Users.find({ pan: { $in: batch } }, { pan: 1 }),
          Member.find({ pan: { $in: batch } }, { pan: 1 }),
        ]);
        [...usersFound, ...membersFound].forEach((doc) => {
          duplicatePans.add(String(doc.pan).trim().toUpperCase());
        });
        console.timeEnd(`PAN-Batch-${idx}`);
      }),
    );

    await Promise.all([...phoneTasks, ...panTasks]);

    res.json({
      totalPhoneRequested: phones.length,
      totalPhoneDuplicate: duplicatePhones.size,
      totalPanRequested: pans.length,
      totalPanDuplicate: duplicatePans.size,
      phoneData: phones.map((num) => ({
        phone: num,
        status: duplicatePhones.has(num) ? "Duplicate" : "Not Duplicate",
      })),
      panData: pans.map((num) => ({
        pan: num,
        status: duplicatePans.has(num) ? "Duplicate" : "Not Duplicate",
      })),
    });
  } catch (error) {
    console.error("❌ Error in /check-data:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

router.post("/infiSchema", async (req, res) => {
  try {
    const data = req.body;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: "Empty data." });
    }

    const uniqueData = data.filter((item, index, self) => {
      const phone = item.phone?.trim();
      const pan = item.pan?.trim().toUpperCase();
      return (
        index ===
        self.findIndex(
          (t) =>
            (t.phone?.trim() && t.phone.trim() === phone) ||
            (t.pan?.trim() && t.pan.trim().toUpperCase() === pan),
        )
      );
    });

    if (uniqueData.length !== data.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate phone or PAN in request.",
      });
    }

    const existing = await Promise.all([
      Users.find({
        $or: uniqueData.flatMap((item) => {
          const arr = [];
          if (item.phone) arr.push({ phone: item.phone.trim() });
          if (item.pan) arr.push({ pan: item.pan.trim().toUpperCase() });
          return arr;
        }),
      }),
      Member.find({
        $or: uniqueData.flatMap((item) => {
          const arr = [];
          if (item.phone) arr.push({ phone: item.phone.trim() });
          if (item.pan) arr.push({ pan: item.pan.trim().toUpperCase() });
          return arr;
        }),
      }),
    ]);

    const combinedExisting = [...existing[0], ...existing[1]];
    if (combinedExisting.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Phone or PAN already exists in DB.",
      });
    }

    const saved = await Member.insertMany(uniqueData, { ordered: false });
    res.status(200).json({ success: true, message: `${saved.length} saved.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
