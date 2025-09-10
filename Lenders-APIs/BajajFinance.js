const express = require("express");
const router = express.Router();
const axios = require("axios");

function generateMessageId() {
  const date = new Date();
  const dateStr = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
    date.getDate(),
  ).padStart(2, "0")}/${date.getFullYear()}`;
  const randomPart = Math.floor(100000000 + Math.random() * 900000000);
  return `${dateStr}-${randomPart}`;
}

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
      home_address,
      office_address,
      type_of_residence,
      company_name,
    } = req.body;

    const payload = {
      leadDetails: {
        firstName: name,
        middleName: "",
        lastName: last_name,
        emailId: email,
        uniqueId: pancard,
        leadSource: "ONLINE",
        dateOfBirth: dob,
        employmentType: employType,
        grossReceipt: "", // optional / aap add kar sakte ho
        pinCode: pincode,
        gender: "", // optional
        mobileNumber: phone,
        addressDetails: [
          {
            addrType: "CURRES",
            pinCode: pincode,
            country: "IN",
            city: home_address.city || "",
            street: home_address.street || "",
          },
        ],
        phoneDetails: [
          {
            phoneNumber: phone,
            phoneTypeCode: "MOBILE",
          },
        ],
        emailDetails: [
          {
            emailId: email,
            emailTypeCode: "PERSONAL",
          },
        ],
      },
      productOffer: {
        businessVertical: "SHOL",
        offerProduct: "HHL",
        offerName: "Campaign PO",
        baseProduct: "PROSPECT",
        bT: "Fresh",
        extCustSeg: "NEW",
        loanType: "HHL",
        dataMartStatus: "LIVE",
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
