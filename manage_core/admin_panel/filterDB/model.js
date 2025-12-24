// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
  city: String,
  dob: String, // or Date if you want to store as date
  email: String,
  employment: String,
  gender: String,
  income: String,
  pan: String,
  pincode: String,
  state: String,
});

module.exports = mongoose.model("situ", userSchema, "smcoll");
