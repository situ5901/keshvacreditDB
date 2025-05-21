const mongoose = require("mongoose");

const LeadWebRamFin = new mongoose.Schema({
  mobile: String,
  name: String,
  email: String,
  employeeType: String,
  dob: Date,
  pancard: String,
  loanAmount: Number,
});

const LeadDefault = new mongoose.Schema({
  mobileNumber: String,
  email: String,
  panNumber: String,
  name: String,
  dob: Date,
  income: Number,
  employmentType: String,
  orgName: String,
});

// Models using the same collection name "webRamFin"
const LeadModel1 = mongoose.model("LeadModel1", LeadWebRamFin, "webRamFin");
const LeadModel2 = mongoose.model("LeadModel2", LeadDefault, "webRamFin");

const Lead = {
  webRamFin: LeadModel1,
  default: LeadModel2,
};

module.exports = Lead;
