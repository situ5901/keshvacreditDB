const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "testdb",
  new mongoose.Schema({}, { collection: "testdb", strict: false }),
);

const BaseURL =
  "https://oneweb.bajajhousingfinance.in/plms-api/services/campaignRest/createCampaign";
const partnerId = "Keshvacredit";


function generateMessageId() {
const response = await axios.post(BaseURL, payload, {
  headers: {
    Authorization: "dXNlcjpBRE1JTjpKYW5AMjAxOQ==",
    "Content-Type": "application/json",
    ENTITYID: "1",
    LANGUAGE: "EN",
    MESSAGEID: generateMessageId(),  // 👈 yaha dynamic aa jayega
    REQUESTTIME: new Date().toISOString(), // dynamic request time
    SERVICENAME: "createCampaign",
    SERVICEVERSION: "1",
  },
});
  const date = new Date();
  const dateStr = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
    date.getDate(),
  ).padStart(2, "0")}/${date.getFullYear()}`; // MM/DD/YYYY
  const randomPart = Math.floor(100000000 + Math.random() * 900000000); // 9 digit random number
  return `${dateStr}-${randomPart}`;
}

async function sendLead() {
  try {
    // DB से user data fetch करना
    const user = await UserDB.findOne(); // पहली entry, आप filter लगा सकते हैं

    if (!user) return console.log("🚫 No user found in DB");

    // Axios request payload
    const payload = {
      leadDetails: {
        firstName: user.name.split(" ")[0] || "",
        middleName: user.name.split(" ")[1] || "",
        lastName: user.name.split(" ")[2] || "",
        emailId: user.email,
        uniqueId: user.pan || "",
        profession: "",
        leadSource: "ONLINE",
        leadType: "",
        dateOfBirth: user.dob,
        monthlyObligations: "",
        employmentType: user.employment || "",
        employerId: "",
        natureOfBusiness: "",
        leadReference: "",
        nameOfDegree: "",
        grossReceipt: user.income || "",
        turnOver: "",
        netProfit: "",
        pinCode: user.pincode,
        netSalary: "",
        currExperience: "",
        experience: "",
        gender: user.gender,
        hostLeadId: "",
        specialization: "",
        appliedTenor: "",
        mobileNumber: user.phone,
        addressDetails: [
          {
            addrType: "CURRES",
            pinCode: user.pincode,
            country: "IN",
            district: "",
            landmark: "",
            locality: "",
            priority: 5,
            street: "",
            city: user.city,
            houseNumber: "",
            flatNumber: "",
          },
        ],
        phoneDetails: [
          {
            phoneNumber: user.phone,
            phoneTypeCode: "MOBILE",
            priority: 5,
          },
        ],
        emailDetails: [
          {
            emailId: user.email,
            emailTypeCode: "PERSONAL",
            priority: 5,
          },
        ],
      },
      productOffer: {
        businessVertical: "SHOL",
        offerProduct: "HHL",
        processType: "",
        offerName: "Campaign PO",
        baseProduct: "PROSPECT",
        bT: "Fresh",
        extCustSeg: "NEW",
        productOfferSource: "",
        ownerId: "",
        ownerType: "Queue",
        loanType: "HHL",
        dataMartStatus: "LIVE",
        pOValidity: "",
        campaignDetails: {
          campaignType: "",
          campaignName: "",
          campaignDate: "",
          utmSource: "AFFILIATE",
          utmMedium: "DIGITAL",
          utmCampaign: "PARTNER NAME",
          utmContent: "PUBLISHER PUT DETAILS",
          utmProduct: "",
          downPaymentReceived: "",
          propertyType: "",
          itrFieldlast3Years: "",
          requiredLoanamount: "",
          currentBankName: "",
          currentRateOfInterest: "",
          propertyIdentified: "",
          propertyLocation: "",
          vouchers: "",
          responseType: "HOT",
          propensity: "",
        },
        loanDetails: {
          loanType: "HHL",
          appliedLoanAmount: "",
          appliedTenor: "",
          appliedROI: "",
        },
        sourcingDetails: {
          sourcingBranch: "1164",
          sourcingChannelCategory: "",
          source: "",
          aSMName: "",
          sourcingChannel: "",
        },
      },
    };

    // API request
    const response = await axios.post(BaseURL, payload, {
      headers: {
        Authorization: "dXNlcjpBRE1JTjpKYW5AMjAxOQ==",
        "Content-Type": "application/json",
        ENTITYID: "1",
        LANGUAGE: "EN",
        MESSAGEID: "09/01/2025-123456784",
        REQUESTTIME: "2025-09-01T16:00:00",
        SERVICENAME: "createCampaign",
        SERVICEVERSION: "1",
      },
    });

    console.log("✅ Response:", response.data);
  } catch (err) {
    console.error("🚫 Error sending lead:", err.response?.data || err.message);
  }
}

sendLead();
