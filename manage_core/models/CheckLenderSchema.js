const mongoose = require("mongoose");

const MoneyViewSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    pan: String,
    dob: Date,
    email: String,
    city: String,
    state: String,
    gender: String,
    employment: String,
    income: Number,
    pincode: Number,
    consent: Date,
  },
  {
    collection: "MoneyView", // 👈 force exact collection name
  },
);

module.exports = mongoose.model("MoneyView", MoneyViewSchema);
