const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();
const path = require("path");

const MONGODB_URINEW = process.env.MONGODB_URINEW;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

async function getUser() {
  try {
    const user = await UserDB.findOne();
    console.log(user);
    return user;
  } catch (err) {
    console.log(err);
  }
}

async function Encripted(user) {
  try {
    const payload = {
      fullname: user.name,
      email: user.email,
      pancard: user.pancard,
    };
    console.log(payload);
    return payload;
  } catch (err) {
    console.log(err);
  }
}

getUser();
