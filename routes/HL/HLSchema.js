const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const HLSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    income: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: true,
    },
    loanAmount: {
      type: String,
      required: true,
    },
    employmentType: {
      type: String,
      required: true,
    },
    dob: {
      type: String,
      required: true,
    },
    pan: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: "Home Loan",
    },
  },
  { versionKey: false },
);

module.exports = mongoose.model("homeloan", HLSchema);
