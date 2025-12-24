const mongoose = require("mongoose");

const moneyviewLeadSchema = new mongoose.Schema({
  pan: String,
  email: String,
  mobile: String,
  gender: String,
  employmentType: String,
  declaredIncome: String,
  employerName: String,
  dateOfBirth: String,
  partnerRef: String,
  incomeMode: String,
  educationLevel: String,
  pincode: String,
  city: String,
  addressLine1: String,
  addressLine2: String,
  state: String,
  annualFamilyIncome: String,
  name: String,
  loanPurpose: String,
  maritalStatus: String,
  moneyView: { type: Boolean, default: true },
  token: String,
  leadId: String,
  dedupe: Object,
  lead: Object,
  offers: Object,
  journeyUrl: Object,

  createdAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.webuserdbs ||
  mongoose.model("webuserdbs", moneyviewLeadSchema);
