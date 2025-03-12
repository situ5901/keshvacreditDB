const { model, Schema } = require("mongoose");

const userSchema = new Schema(
  {
    name: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    accounts: [{ type: Schema.Types.Mixed }],
    pan: { type: String, trim: true },
    aadhar: { type: String, trim: true },
    dob: { type: String, trim: true },
    email: { type: String, trim: true },
    addr: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    gender: { type: String, enum: ["MALE", "FEMALE"], default: "MALE" },
    employment: {
      type: String,
      enum: ["Salaried", "Self-employed", "No-employment"],
      default: "Salaried",
    },
    company_name: { type: String, trim: true },
    income: { type: String, trim: true },
    ref: { type: String, trim: true },
    partner: { type: String, default: "None" },
    partnerHistory: [
      {
        name: { type: String, required: true },
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ["new", "dedupe"], required: true },
      },
    ],
    partnerSent: { type: Boolean },
    residence_type: { type: String, trim: true },
    phoneOtp: { type: String, length: 4 },
    pincode: { type: String, length: 6 },
    phoneOtpExpire: { type: Date },
    eformFilled: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    consentData: { date: { type: String }, ip: { type: String } },
    consent: { type: String },
    accountDeleted: { type: Boolean },
    business_details: {
      company_type: { type: String, trim: true },
      business_name: { type: String, trim: true },
      business_age: { type: String, trim: true },
      annual_turnover: { type: String, trim: true },
      gstRegistered: { type: Boolean },
      currentAccount: { type: Boolean },
    },
  },
  { timestamps: true },
);

module.exports = model("testingdb", userSchema);
