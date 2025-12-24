const mongoose = require("mongoose");

const CampConsentSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true },
    consent: { 
      type: [String], 
      default: function() {
        return [
          "We value your privacy. To proceed, we need your consent to collect and process your personal data, such as name, phone number, and PAN details. By continuing, you agree to our Privacy Policy and Terms & Conditions.",
          "I consent to Hero FinCorp requesting my credit information report from credit bureaus, KYC details from CKYCR/UIDAI, and securely sharing my data with third parties strictly for the purpose of facilitating my loan."
        ];
      }
    },
    verifiedAt: { type: String } 
  },
  { strict: false, timestamps: true, versionKey: false }
);

module.exports = mongoose.model("CampConsent", CampConsentSchema);
