const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
//update
const MONGODB_URINEW = process.env.MONGODB_URINEW;
const BATCH_SIZE = 10;
const Partner_id = "Keshvacredit";
const DEDUPE_API_URL =
  "https://api.bharatloanfintech.com/marketing-check-dedupe/";
const PushAPI_URL = "https://api.bharatloanfintech.com/marketing-push-data";
const loanAmount = "20000";

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);
UserDB();
