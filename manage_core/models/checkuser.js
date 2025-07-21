const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  phone: String,
  employment: String,
  dob: String,
  email: String,
  gender: String,
  name: String,
  pan: String,
  city: String,
  income: String,
  pincode: String,
  state: String,
});

module.exports = mongoose.model("checkfields", userSchema);
