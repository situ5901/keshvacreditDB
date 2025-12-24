const express = require("express");
const router = express.Router();
const axios = require("axios");
const { saveApiResponse } = require("../utils/saveApiResponse");

const DEDUPE_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/customerEligibility";
const CREATE_LEAD_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/preApprovalOffer";

router.post("/zypewebapi", async (req, res) => {
  try {
    const { phone, email, panNumber, name, dob, income, employmentType } =
      req.body;

    if (
      !phone ||
      !email ||
      !panNumber ||
      !name ||
      !dob ||
      !income ||
      !employmentType
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const eligible = await axios.post(DEDUPE_API, {
      mobileNumber: phone,
      panNumber: panNumber,
      partnerId: "a8ce06a0-4fbd-489f-8d75-345548fb98a8",
    });

    const eligibleData = eligible.data.data;
    console.log("✅ Eligibility Data:", eligibleData);

    // ✅ Step 2: Create Lead (PreApproval Offer)
    const leadApi = await axios.post(
      CREATE_LEAD_API,
      {
        mobileNumber: phone,
        email,
        panNumber,
        name,
        dob,
        income,
        employmentType,
        partnerId: "a8ce06a0-4fbd-489f-8d75-345548fb98a8",
        bureauType: 3,
        bureauName: "experian",
        bureauData: "<BureauSampleDataInXMLText>",
      },
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    const leadApiData = leadApi.data.data;
    console.log("✅ Lead API Data:", leadApiData);

    // ✅ Combine both API responses
    const combinedData = {
      eligibility: eligibleData,
      preApproval: leadApiData,
    };

    // ✅ Save to DB
    if (eligibleData?.status && eligibleData.status === "REJECT") {
      await saveApiResponse(phone, "Zype", combinedData, "failure");
      return res.status(200).json({
        success: false,
        message: "Application Rejected by Eligibility Check",
        response: combinedData,
      });
    } else {
      await saveApiResponse(phone, "Zype", combinedData, "success");
      return res.status(200).json({
        success: true,
        message: "Data saved successfully",
        response: combinedData,
      });
    }
  } catch (err) {
    const errMsg = err.response?.data || err.message;
    const phone = req.body?.phone || "unknown";

    await saveApiResponse(phone, "Zype", errMsg, "failure", "API call failed");

    if (err.response?.status === 403) {
      return res.status(403).json({
        success: false,
        message:
          "❌ Your IP is not whitelisted by Zype. Contact support to whitelist your server IP.",
      });
    }

    console.error("❌ Zype Lead Error:", errMsg);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: errMsg,
    });
  }
});

module.exports = router;
