const express = require("express");
const axios = require("axios");
const { saveApiResponse } = require("../utils/saveApiResponse");

const router = express.Router();

const DEDUPE_API = "https://www.ramfincorp.com/new-api/customers/check_dedupe";
const LEAD_API = "https://www.ramfincorp.com/new-api/customers/lead_push";

router.post("/ramfinwebAPI", async (req, res) => {
    const { phone, name, email, employeeType, dob, pan, loanAmount } = req.body;

    try {
        // ✅ Validate all required fields
        if (!phone || !name || !email || !employeeType || !dob || !pan || !loanAmount) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const RamData = {
            mobile: phone,
            pancard: pan,
            PartnerName: "Keshvacredit",
        };

        console.log("📤 RamFin Request Body:", RamData);

        const headers = {
            "Content-Type": "application/json",
            Authorization:
                "Basic cmFtZmluX2U2NmIxNmE5ZjZiNzQ5YTAzOTBmZWRjM2U4ZjNkZjZmOmI3YjJlZDU1MjM5NjA5NzM5NmQwOWE2N2RkZTI4NjUyMDNjZDMxYjA=",
        };

        // ✅ Call Dedupe API
        const dedupeResponse = await axios.post(DEDUPE_API, RamData, { headers });
        console.log("✅ Dedupe Response:", dedupeResponse.data);

        // ✅ Call Lead Push API
        const leadResponse = await axios.post(LEAD_API, RamData, { headers });
        console.log("✅ Lead Response:", leadResponse.data);

        const combinedResponses = [
            { api: "Dedupe", response: dedupeResponse.data },
            { api: "LeadPush", response: leadResponse.data },
        ];

       if(leadResponse.data.status === "success"){
           await saveApiResponse(phone, "RamFin", combinedResponses, "success");
           return res.status(200).json({
               success: true,
               message: "Lead created successfully!",
               responses: combinedResponses,
           });
       }

    } catch (err) {
        const errMsg = err.response?.data || err.message;
        console.error("❌ RamFin API Error:", errMsg);

        await saveApiResponse(phone, "RamFin", errMsg, "failure", "API call failed");

        if (err.response?.status === 400) {
            return res.status(400).json({
                success: false,
                message: err.response?.data?.message || "Bad Request - Invalid data provided.",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: errMsg,
        });
    }
});

module.exports = router;
