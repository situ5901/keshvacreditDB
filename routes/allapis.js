const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const pLimit = require("p-limit");
require("dotenv").config();
const Users = require("../models/checkdata"); // adjust path if needed
const Member = require("../models/infiSchema");
mongoose.set("strictQuery", true);

const pLimit = require("p-limit");

router.post("/check-data", async (req, res) => {
  try {
    const { phone = [], pan = [] } = req.body;

    if ((!Array.isArray(phone) || phone.length === 0) &&
        (!Array.isArray(pan) || pan.length === 0)) {
      return res.status(400).json({
        message: "Please provide at least one phone or PAN array",
      });
    }

    const phones = phone.map((p) => String(p).trim());
    const pans = pan.map((p) => String(p).trim());

    const BATCH_SIZE = 200;
    const CONCURRENCY = 5;

    const chunkArray = (arr, size) =>
      arr.reduce((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);

    const duplicatePhones = new Set();
    const duplicatePans = new Set();

    const limit = pLimit(CONCURRENCY);

    // PHONE CHECK
    const phoneChunks = chunkArray(phones, BATCH_SIZE);
    const phoneTasks = phoneChunks.map((batch, idx) =>
      limit(async () => {
        console.time(`Phone-Batch-${idx}`);
        const foundUsers = await Users.find(
          { phone: { $in: batch } },
          { phone: 1 }
        );
        foundUsers.forEach((user) => {
          duplicatePhones.add(String(user.phone).trim());
        });
        console.timeEnd(`Phone-Batch-${idx}`);
      })
    );

    // PAN CHECK
    const panChunks = chunkArray(pans, BATCH_SIZE);
    const panTasks = panChunks.map((batch, idx) =>
      limit(async () => {
        console.time(`PAN-Batch-${idx}`);
        const foundUsers = await Users.find(
          { pan: { $in: batch } },
          { pan: 1 }
        );
        foundUsers.forEach((user) => {
          duplicatePans.add(String(user.pan).trim());
        });
        console.timeEnd(`PAN-Batch-${idx}`);
      })
    );

    await Promise.all([...phoneTasks, ...panTasks]);

    const phoneResponse = phones.map((num) => ({
      phone: num,
      status: duplicatePhones.has(num) ? "Duplicate" : "Not Duplicate",
    }));

    const panResponse = pans.map((num) => ({
      pan: num,
      status: duplicatePans.has(num) ? "Duplicate" : "Not Duplicate",
    }));

    res.json({
      totalPhoneRequested: phones.length,
      totalPhoneDuplicate: duplicatePhones.size,
      totalPanRequested: pans.length,
      totalPanDuplicate: duplicatePans.size,
      phoneData: phoneResponse,
      panData: panResponse,
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
    const data = req.body;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: "Empty data." });
    }
    const uniqueData = data.filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          (t) => t.phone === item.phone,
          t.pan?.toUpperCase() === item.pan?.toUpperCase(),
        ),
    );
    if (uniqueData.length !== data.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate phone or PAN in request.",
      });
    }
    const existing = await Member.find({
      $or: uniqueData.flatMap((item) => {
        const orArr = [];
        if (item.phone) orArr.push({ phone: item.phone });
        if (item.pan) orArr.push({ pan: item.pan.toUpperCase() });
        return orArr;
      }),
    });

    if (existing.length > 0) {
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
