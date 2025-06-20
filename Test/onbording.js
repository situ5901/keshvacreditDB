const express = require("express");
const router = express.Router();
const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGO_URINEW);
const db = client.db("Keshvacredit");
const collection = db.collection("userdb");

router.post("/filterdata", async (req, res) => {
  try {
    const phones = req.body.phones;

    if (!Array.isArray(phones)) {
      return res.status(400).json({ error: "phones should be an array." });
    }

    const formattedPhones = phones.map((p) => String(p));
    const users = await collection
      .find({ phone: { $in: formattedPhones } })
      .toArray();

    res.json({
      total_found: users.length,
      users,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
