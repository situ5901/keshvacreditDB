require("dotenv").config();
const express = require("express");
const router = express.Router();
const axios = require("axios");
const Userdb = require("../Lenders-APIs/PartnerSchema.js");

router.post("/moneyview/lead", async (req, res) => {
  const { MV_USERNAME, MV_PASSWORD, MV_PARTNER_CODE } = process.env;

  const {
    pan,
    email,
    mobile,
    gender,
    employmentType,
    declaredIncome,
    employerName,
    dateOfBirth,
    incomeMode,
    educationLevel,
    pincode,
    city,
    addressLine1,
    addressLine2,
    state,
    annualFamilyIncome,
    name,
    loanPurpose,
    maritalStatus,
  } = req.body;

  const leadData = {
    pan,
    email,
    mobile,
    gender,
    employmentType,
    declaredIncome,
    employerName,
    dateOfBirth,
    partnerRef: "2021020632",
    incomeMode,
    educationLevel,
    pincode,
    city,
    addressLine1,
    addressLine2,
    state,
    annualFamilyIncome,
    name,
    loanPurpose,
    maritalStatus,
    moneyView: true,
    token: null,
    leadId: null,
    dedupe: null,
    lead: null,
    offers: null,
    journeyUrl: null,
  };

  try {

    const tokenRes = await axios.post(
      "https://atlas.whizdm.com/atlas/v1/token",
      {
        userName: MV_USERNAME,
        password: MV_PASSWORD,
        partnerCode: Number(MV_PARTNER_CODE),
      },
      { headers: { "Content-Type": "application/json" } },
    );

    const token = tokenRes.data?.data?.token || tokenRes.data?.token;
    leadData.token = token;

    // dedupe check
    const dedupeRes = await axios.post(
      "https://atlas.whizdm.com/atlas/v1/lead/dedupe",
      {
        panNo: pan,
        email: email,
        mobileNo: mobile,
      },
      { headers: { "Content-Type": "application/json", token } },
    );
    leadData.dedupe = dedupeRes.data;

    // create lead
    const leadRes = await axios.post(
      "https://atlas.whizdm.com/atlas/v1/lead",
      {
        gender,
        partnerCode: Number(MV_PARTNER_CODE),
        employmentType,
        emailList: [{ type: "primary_device", email }],
        declaredIncome,
        bureauPermission: 1,
        employerName,
        dateOfBirth,
        partnerRef: "2021020632",
        incomeMode,
        educationLevel,
        phone: mobile,
        sourceType: "source",
        moneyView: true,
        addressList: [
          {
            pincode,
            city,
            addressType: "current",
            addressLine1,
            addressLine2,
            state,
          },
        ],
        annualFamilyIncome,
        name,
        loanPurpose,
        pan,
        maritalStatus,
      },
      { headers: { "Content-Type": "application/json", token } },
    );

    leadData.lead = leadRes.data;
    leadData.leadId =
      leadRes.data?.data?.leadId ||
      leadRes.data?.leadId ||
      leadRes.data?.data?.id;

    // offers + journey URL
    const [offerRes, statusRes] = await Promise.all([
      axios.get(`https://atlas.whizdm.com/atlas/v1/offers/${leadData.leadId}`, {
        headers: { "Content-Type": "application/json", token },
      }),
      axios.get(
        `https://atlas.whizdm.com/atlas/v1/journey-url/${leadData.leadId}`,
        {
          headers: { "Content-Type": "application/json", token },
        },
      ),
    ]);

    leadData.offers = offerRes.data;
    leadData.journeyUrl = statusRes.data;

    return res.status(200).json({
      success: true,
      msg: "Lead processed successfully",
      data: leadData,
    });
  } catch (err) {
    console.error("⚠️ API Error:", err?.response?.data || err.message);
    return res.status(500).json({
      success: false,
      msg: "Failed to process lead",
      error: err.message,
    });
  }
});

// router.post("/moneyview/status", async (req, res) => {
//   const { leadId, eventType, eventStatus, timeStamp, extraDetails } = req.body;
//   if (!leadId || !eventType || !eventStatus || !timeStamp) {
//     return res.status(400).json({ message: "Missing required fields" });
//   }
//
//   console.log("MoneyView se callback aaya:", req.body);
//
//   return res.status(200).json({ message: "Callback received successfully" });
// });

module.exports = router;
