const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

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
      console.log("InstaMoney Under Construction");
    }
  } catch (err) {
    console.log("Error in test:", err);
  }
}
test();
