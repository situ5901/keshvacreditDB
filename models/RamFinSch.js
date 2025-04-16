const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema({
  mobile: String,
  name: String,
  email: String,
  employeeType: String,
  dob: Date,
  pancard: String,
  loanAmount: Number,
});

const Lead = mongoose.model("webRamFin", leadSchema); // Ensure correct model name

module.exports = Lead;
