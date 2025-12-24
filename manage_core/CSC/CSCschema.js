const mongoose = require("mongoose");

// --- 1. User Schema Definition ---
const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String },
    username: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },
    Aadhar: { type: String },
    PAN: { type: String },
    CenterName: { type: String },
    location: { type: String },
    accountNumber: { type: String },
    bankName: { type: String },
    IFSC: { type: String },
  },
  { versionKey: false },
);

// --- 2. Gold Loan Schema Definition ---
const goldLoanSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    email: String,
    pincode: String,
    city: String,
    loanAmount: String,
    goldWeight: String,
    purity: String,
    karat: Number,
    pricePerGram: Number,
    employment: String,
    monthlyIncome: String,
    existingEMI: String,
    agree: Boolean,
  },
  { strict: false, versionKey: false },
);

const CSCSchema = new mongoose.Schema(
  {
    cscName: {
      type: String,
      required: true,
    },
    cscMail: {
      type: String,
      required: true,
      unique: true,
    },
    cscPassword: {
      type: String,
      required: true,
    },
  },
  { versionKey: false, strict: false }
);

module.exports = {
  CsCenter: mongoose.model("CsCenter", UserSchema),
  GoldLoan: mongoose.model("GoldLoan", goldLoanSchema),
  CSCmodel: mongoose.model("CSCmodel", CSCSchema),
};
