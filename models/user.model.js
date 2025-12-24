const { model, Schema } = require("mongoose");

const userSchema = new Schema(
  {
    name: { type: String },
    phone: { type: String, required: true },
    accounts: [
      {
        name: String,
        status: String,
        message: String,
        resp_date: Date,
        response: Schema.Types.Mixed, // 👈 add this
      },
    ],
    utm_history: [
      {
        utm_source: String,
        date: Date,
      },
    ],
    refArr: [
      {
        name: String,
        date: Date,
      },
    ],
    businessName: { type: String },
    doesFileITR: { type: String },
    doesFileGST: { type: String },
    businessType: { type: String },
    agent_id: {
      type: String,
    },
    Application: { Type: String },
    platform: { type: String },
    salaryMode: { type: String },
    bankName: { type: String },
    SalaryType: { type: String },
    CompanyName: { type: String },
    UserPostion: { type: String },
    CompanyAddress: { type: String },
    CompleteAddress: { type: String },
    salarySlip: { type: String },
    aadhar: { type: String },
    dob: { type: String },
    loanAmount: { type: String },
    email: { type: String },
    addr: { type: String },
    pan: { type: String },
    city: { type: String },
    state: { type: String },
    gender: { type: String },
    employment: { type: String },
    company_name: { type: String },
    TrackUtm: [
    {
        utm_source: { type: String },
        utm_medium: { type: String },
        utmReferral: { type: String }, // '-' ki jagah Capital 'R'
    }
    ],
    income: { type: String },
    partner: { type: String, default: "None" },
    partnerHistory: [
      {
        name: { type: String, required: true },
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ["new", "dedupe"], required: true },
      },
    ],
    partnerSent: { type: Boolean },
    residence_type: { type: String },
    phoneOtp: { type: String, length: 4 },
    pincode: { type: String, length: 6 },
    phoneOtpExpire: { type: Date },
    eformFilled: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    consentData: { date: { type: String }, ip: { type: String } },
consent: { 
        type: [String], // स्ट्रिंग्स का ऐरे
        default: function() {
            return [
                "We value your privacy. To proceed, we need your consent to collect and process your personal data, such as name, phone number, and PAN details.By continuing, you agree to our Privacy Policy and Terms & Conditions.",
                "I consent to Hero FinCorp requesting my credit information report from credit bureaus, KYC details from CKYCR/UIDAI, and securely sharing my data with third parties strictly for the purpose of facilitating my loan."
            ];
        }
    },
    accountDeleted: { type: Boolean },
    business_details: {
      company_type: { type: String },
      business_name: { type: String },
      business_age: { type: String },
      annual_turnover: { type: String },
      gstRegistered: { type: Boolean },
      currentAccount: { type: Boolean },
    },
  },
  { timestamps: true, strict: false, versionKey: false },
);

module.exports = model("webUserDB", userSchema);
