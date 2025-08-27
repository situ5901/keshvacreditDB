const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

MONGODB_URINEW;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "testdb",
  new mongoose.Schema({}, { collection: "testdb", strict: false }),
);

async function test() {
  try {
    if (MONGODB_URINEW) {
      console.log("BajajFinance Under Construction");
    }
  } catch (err) {
    console.log("Error in test:", err);
  }
}
test();
