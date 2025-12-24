const axios = require("axios");
const express = require("express");
const router = express.Router();

function generateMessageId() {
  return "MSG-" + Date.now();
}
//upsate
router.post("/partner/bajaj", async (req, res) => {
  try {
    const {
      phone,
      name,
      last_name,
      employType,
      pancard,
      dob,
      email,
      pincode,
      home_address = {},
      office_address = {},
      type_of_residence,
      company_name,
    } = req.body;

    const payload = {
      leadDetails: {
        firstName: name || "",
        middleName: "",
        lastName: last_name || "",
        emailId: email || "",
        uniqueId: pancard || "",
        profession: "",
        leadSource: "ONLINE",
        leadType: "",
        dateOfBirth: dob || "",
        monthlyObligations: "",
        employmentType: employType || "",
        employerId: company_name || "",
        natureOfBusiness: "",
        leadReference: "",
        nameOfDegree: "",
        grossReceipt: "",
        turnOver: "",
        netProfit: "",
        pinCode: pincode || "",
        netSalary: "",
        currExperience: "",
        experience: "",
        gender: "",
        hostLeadId: "",
        specialization: "",
        appliedTenor: "",
        mobileNumber: phone,
        addressDetails: [
          {
            addrType: "CURRES",
            pinCode: pincode || "",
            country: "IN",
            district: "",
            landmark: "",
            locality: "",
            priority: 5,
            street: home_address.street || "",
            city: home_address.city || "",
            houseNumber: home_address.houseNumber || "",
            flatNumber: home_address.flatNumber || "",
          },
        ],
        phoneDetails: [
          {
            phoneNumber: phone,
            phoneTypeCode: "MOBILE",
            priority: 5,
          },
        ],
        emailDetails: [
          {
            emailId: email || "",
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
          utmCampaign: "AF13_KESHCR",
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
          sourcingBranch: "",
          sourcingChannelCategory: "",
          source: "",
          aSMName: "",
          sourcingChannel: "",
        },
      },
    };

    const response = await axios.post(
      "https://oneweb.bajajhousingfinance.in/plms-api/services/campaignRest/createCampaign",
      payload,
      {
        headers: {
          Authorization: "dXNlcjpBRE1JTjpKYW5AMjAxOQ==",
          "Content-Type": "application/json",
          ENTITYID: "1",
          LANGUAGE: "EN",
          MESSAGEID: generateMessageId(),
          REQUESTTIME: new Date().toISOString(),
          SERVICENAME: "createCampaign",
          SERVICEVERSION: "1",
        },
      },
    );

    res.json({ success: true, data: response.data });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
