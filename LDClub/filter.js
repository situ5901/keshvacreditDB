const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const pLimit = require("p-limit");
//update 05/09/2545
mongoose.set("strictQuery", true);

// chunk helper
function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

router.post("/filterdata", async (req, res) => {
  let { phones } = req.body;

  if (
    !Array.isArray(phones) ||
    !phones.length ||
    phones.some((p) => isNaN(p))
  ) {
    return res.status(400).json({
      success: false,
      message: "phones[] must be a valid number array",
    });
  }

  console.log(`✅ Received total ${phones.length} numbers`);

  phones = phones.map((p) => String(p).trim());

  const BATCH_SIZE = 1000; // 1000 per query
  const CONCURRENCY_LIMIT = 5; // 5 queries in parallel
  const chunks = chunkArray(phones, BATCH_SIZE);
  const limit = pLimit(CONCURRENCY_LIMIT);
  const allResults = [];

  try {
    const tasks = chunks.map((batch, idx) =>
      limit(async () => {
        console.time(`Batch-${idx}`);

        const userdbResults = await mongoose.connection
          .collection("userdb")
          .find(
            { phone: { $in: batch } },
            { projection: { RefArr: 0, apiResponse: 0 } },
          )
          .toArray();

        const secondarydbResults = await mongoose.connection
          .collection("webuserdbs")
          .find(
            { phone: { $in: batch } },
            { projection: { RefArr: 0, apiResponse: 0 } },
          )
          .toArray();

        console.timeEnd(`Batch-${idx}`);
        allResults.push(...userdbResults, ...secondarydbResults);
      }),
    );

    await Promise.all(tasks);

    return res.status(200).json({
      success: true,
      totalRecords: allResults.length,
      data: allResults,
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

module.exports = router;
