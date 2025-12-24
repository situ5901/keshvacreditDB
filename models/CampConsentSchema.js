const mongoose = require("mongoose");

const CampConsentSchema = new mongoose.Schema({
    phone: { 
        type: String, 
        required: true 
    },
    consent: { 
        type: String, 
        required: true 
    },
    verifiedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { 
    strict: false // Isse aap extra fields bhi save kar payenge
});

module.exports = mongoose.model("CampConsent", CampConsentSchema);
