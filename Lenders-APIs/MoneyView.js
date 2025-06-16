require("dotenv").config();
const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/moneyview/lead", async (req, res) => {
  try {
    const { MV_USERNAME, MV_PASSWORD, MV_PARTNER_CODE } = process.env;

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
    if (!token) {
      return res.status(400).json({
        success: false,
        msg: "Token not found in response",
        rawResponse: tokenRes.data,
      });
    }

    const {
      pan,
      email,
      mobile,
      gender,
      employmentType,
      declaredIncome,
      employerName,
      dateOfBirth,
      partnerRef,
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

    const dedupeRes = await axios.post(
      "https://atlas.whizdm.com/atlas/v1/lead/dedupe",
      {
        panNo: pan,
        email: email,
        mobileNo: mobile,
      },
      {
        headers: {
          "Content-Type": "application/json",
          token,
        },
      },
    );

    if (dedupeRes.data?.duplicateFound === true) {
      return res.json({
        success: false,
        msg: dedupeRes.data?.message,
        dedupe: dedupeRes.data,
      });
    }

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
        partnerRef,
        incomeMode,
        educationLevel,
        phone: mobile,
        sourceType: "source",
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
      {
        headers: {
          "Content-Type": "application/json",
          token,
        },
      },
    );

    const leadId =
      leadRes.data?.data?.leadId ||
      leadRes.data?.leadId ||
      leadRes.data?.data?.id;

    if (!leadId) {
      return res.status(400).json({
        success: false,
        msg: "Lead ID not found from Lead API response",
        rawLeadResponse: leadRes.data,
      });
    }

    const offerRes = await axios.get(
      `https://atlas.whizdm.com/atlas/v1/offers/${leadId}`,
      {
        headers: {
          "Content-Type": "application/json",
          token,
        },
      },
    );

    const statusRes = await axios.get(
      `https://atlas.whizdm.com/atlas/v1/journey-url/${leadId}`,
      {
        headers: {
          "Content-Type": "application/json",
          token,
        },
      },
    );

    res.json({
      success: true,
      token,
      leadId,
      dedupe: dedupeRes.data,
      lead: leadRes.data,
      offers: offerRes.data,
      journeyUrl: statusRes.data,
    });
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      raw: err.response?.data || null,
    });
  }
});

module.exports = router;
