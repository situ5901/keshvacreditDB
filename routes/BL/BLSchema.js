const mongoose = require("mongoose");

const businessLoanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    phone: {
      type: String,
    },
    email: {
      type: String,
    },
    loanAmount: {
      type: String,
    },
    gender: {
      type: String,
    },
    companyType: {
      type: String,
    },
    selfEmployedProfessional: {
      type: String,
    },

    // Step 2 Fields
    pan: {
      type: String,
    },
    dob: {
      type: String,
    },
    businessName: {
      type: String,
    },
    gstRegistered: {
      type: String,
    },
    businessAge: {
      type: String,
    },
    annualTurnover: {
      type: String,
    },
    pincode: {
      type: String,
    },
    //stritic: false
    currentAccount: {
      type: String,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { strict: false },
);

module.exports = mongoose.model("BLCollection", businessLoanSchema);
