const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model"); // Ensure correct path
const Lead = require("../models/RamFinSch");
const mongoose = require("mongoose");
const BL = require("../routes/BL/BLSchema");
const nodemailer = require("nodemailer");
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const HomeLoan = require("../routes/HL/HLSchema.js");
const otpStorage = new Map();

router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        status: false,
        message: "Phone number required",
      });
    }
    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStorage.set(phone, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    const message = `Dear customer, ${otp} is your login OTP. Valid for 10 minutes. Please do not share with anyone. Regards KeshvaCredit.`;
    const smsUrl = `https://web.smscloud.in/api/pushsms?user=KESHVACREDIT&authkey=${process.env.SMSCLOUD_API_KEY}&sender=KVcred&mobile=${phone}&text=${encodeURIComponent(message)}&templateid=1707174409184160229&rpt=1`;
    const response = await axios.get(smsUrl);

    console.log("✅ OTP Sent to", phone, "=>", otp);
    res.status(200).json({
      status: "Success",
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("❌ SMS Error:", error.response?.data || error.message);
    res.status(500).json({
      status: false,
      message: "Error sending OTP",
      error: error.response?.data || error.message,
    });
  }
});

router.post("/verify-otp", (req, res) => {
  const { phone, otp } = req.body;
  const otpData = otpStorage.get(phone);

  if (
    !otpData ||
    otpData.otp !== parseInt(otp) ||
    Date.now() > otpData.expiresAt
  ) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  otpStorage.delete(phone);
  const token = jwt.sign({ phone }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.status(200).json({ status: "True", message: "OTP verified", token });
});

router.post("/userinfo", async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      employment,
      pan,
      pincode,
      loanAmount,
      gender,
      income,
      salaryMode,
      bankName,
      salarySlip,
      state,
      city,
      platform,
      company_name,
      businessName,
      businessType,
      doesFileITR,
      doesFileGST,
      agentphone,
      dob, // fixed
    } = req.body;

    let missingFields = [];
    if (!name) missingFields.push("name");
    if (!phone) missingFields.push("phone");
    if (!email) missingFields.push("email");
    if (!employment) missingFields.push("employment");
    if (!pan) missingFields.push("pan");
    if (!pincode) missingFields.push("pincode");
    if (!loanAmount) missingFields.push("loanAmount");
    if (!income) missingFields.push("income");
    if (!dob) missingFields.push("dob");

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 400,
        error: "Missing required fields",
        missingFields,
      });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res
        .status(400)
        .json({ status: 400, error: "Invalid phone number format" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res
        .status(400)
        .json({ status: 400, error: "Invalid email format" });
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase())) {
      return res
        .status(400)
        .json({ status: 400, error: "Invalid PAN card format" });
    }

    if (!/^\d{6}$/.test(pincode)) {
      return res
        .status(400)
        .json({ status: 400, error: "Invalid pincode format" });
    }

    if (isNaN(loanAmount) || isNaN(income)) {
      return res.status(400).json({
        status: 400,
        error: "Loan amount and income should be numeric",
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return res.status(400).json({
        status: 400,
        error: "Invalid date of birth format (YYYY-MM-DD expected)",
      });
    }

    const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
    if (existingUser) {
      return res.status(409).json({
        status: 409,
        error: "User with this phone or email already exists",
      });
    }

    const newUser = new User({
      name,
      phone,
      email,
      employment,
      pan: pan.toUpperCase(), // save uppercase PAN
      pincode,
      loanAmount,
      income,
      gender,
      salaryMode,
      platform,
      state,
      city,
      bankName,
      businessName,
      businessType,
      salarySlip,
      dob,
      doesFileITR,
      company_name,
      doesFileGST,
      agentphone,
      utm_source,
      partner: "Keshvacredit",
      createdAt: new Date(),
    });

    await newUser.save();
    res.status(201).json({
      status: "success",
      message: "User information saved successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Error in /userinfo:", error);
    res.status(500).json({
      status: 500,
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

router.post("/getUsers", async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }
  try {
    const user = await User.findOne({ phone });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/updateUser", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ message: "phone is required" });
  }

  try {
    const updatedUser = await User.findOneAndUpdate(
      { phone: phone }, // filter
      { $set: req.body }, // update
      { new: false, upsert: false }, // options
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json("Successfully updated user");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/ramfinwebAPI", async (req, res) => {
  try {
    const { mobile, name, email, employeeType, dob, pancard, loanAmount } =
      req.body;
    if (
      !mobile ||
      !name ||
      !email ||
      !employeeType ||
      !dob ||
      !pancard ||
      !loanAmount
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Prepare data for RamfinCorp API
    const RamData = {
      mobile,
      name,
      loanAmount,
      email,
      employeeType,
      dob,
      pancard,
      PartnerName: "Keshvacredit",
    };

    // Log the request body for debugging
    console.log("Request Body:", req.body);

    // Call the RamfinCorp API
    const ramfinResponse = await axios.post(
      "https://preprod.ramfincorp.co.in/loanapply/ramfincorp_api/lead_gen/api/v1/create_lead",
      RamData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic cmFtZmluX3FwZzhUZ1pGemlTcTY5ejRWb01wd3E2dGdLYUprUDZtOkUydmp4a0pCbHNWZFRFQkhkQ3puV29Nak1IN0ZSS3NW",
        },
      },
    );

    // Log the API response for debugging
    console.log("Ramfin Response:", ramfinResponse.data);

    // Save data to MongoDB
    const newLead = new Lead({
      mobile,
      name,
      email,
      employeeType,
      dob,
      pancard,
      loanAmount,
    });

    // Save to the database
    await newLead.save();

    // Log the saved lead
    console.log("Lead saved:", newLead);

    // Success response
    res.status(200).json({
      message: "Lead created successfully!",
      apiResponse: ramfinResponse.data,
      lead: newLead,
    });
  } catch (error) {
    // Handle errors
    if (error.response) {
      console.error("API Error Response:", error.response.data);
      res.status(error.response.status).json({
        message: "RamfinCorp API returned an error",
        statusCode: error.response.status,
        apiError: error.response.data,
      });
    } else {
      console.error("Error:", error.message);
      res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  }
});

// Your POST API
const webRamfinSchema = new mongoose.Schema({
  phone: String,
  email: String,
  panNumber: String,
  name: String,
  dob: String,
  income: Number,
  employmentType: String,
  orgName: String,
  status: String,
  offer: Number,
  createdAt: { type: Date, default: Date.now },
});

const WebRamfin = mongoose.model("webRamfin", webRamfinSchema);

router.post("/zypewebapi", async (req, res) => {
  const phone = req.body.phone;
  let eligibilityResponse = null;
  let preApprovalResponse = null;

  // Final Status, Offer, and Message
  let finalStatus = "FAILED";
  let finalOffer = 0;
  let finalmessage = null; // Start as null to strictly enforce API messages

  try {
    const { email, panNumber, name, dob, income, employmentType } = req.body;

    // --- 1. Basic Validation ---
    if (
      !phone ||
      !email ||
      !panNumber ||
      !name ||
      !dob ||
      !income ||
      !employmentType
    ) {
      finalmessage = "All required fields were not provided.";
      return res
        .status(400)
        .json({ message: finalmessage, status: "VALIDATION_FAILED", offer: 0 });
    }

    // --- 2. Zype Eligibility API Call (with Robust Error Handling) ---
    try {
      eligibilityResponse = await axios.post(
        "https://prod.zype.co.in/attribution-service/api/v1/underwriting/customerEligibility",
        {
          mobileNumber: phone,
          panNumber,
          partnerId: "a8ce06a0-4fbd-489f-8d75-345548fb98a8",
        },
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      // CRITICAL FIX: Handle Zype's non-standard "SUCCESS" message that throws an HTTP error.
      if (
        error.response &&
        error.response.data &&
        error.response.data.message === "SUCCESS_DEDUPE_NOT_FOUND"
      ) {
        // Synthesize a successful response object to continue the flow
        eligibilityResponse = {
          data: {
            status: "ACCEPT",
            message: "SUCCESS_DEDUPE_NOT_FOUND",
          },
        };
      } else {
        // If it's a real error (like connection fail or other API error), re-throw to the main catch block
        throw error;
      }
    }

    // Set Status and Message from Eligibility Response (or the synthesized response)
    finalStatus = eligibilityResponse.data.status;
    finalmessage = eligibilityResponse.data.message;

    // --- 3. Conditional Pre-Approval Logic ---
    if (eligibilityResponse.data.status === "ACCEPT") {
      // --- 3a. Duplicate Check (RefArr: Zype) ---
      const existingRef = await User.findOne({
        phone: phone,
        "RefArr.name": "Zype",
      });

      if (existingRef) {
        console.log(
          `⚠️ User ${phone} already hit Zype. Skipping Pre-Approval API.`,
        );
        finalStatus = "DUPLICATE";
        finalOffer = existingRef.offer || 0;
        finalmessage = existingRef.message || "Duplicate application detected.";
      } else {
        // --- 3b. Call Pre-Approval API (Only if eligible and not duplicate) ---
        preApprovalResponse = await axios.post(
          "https://prod.zype.co.in/attribution-service/api/v1/underwriting/preApprovalOffer",
          {
            mobileNumber: phone,
            email,
            panNumber,
            name,
            dob,
            income,
            employmentType,
            partnerId: "a8ce06a0-4fbd-489f-8d75-345548fb98a8",
            bureauType: 1,
            bureauName: "experian",
            bureauData: "<BureauSampleDataInXMLText>",
          },
          {
            headers: { "Content-Type": "application/json" },
          },
        );

        finalStatus = preApprovalResponse.data.status;
        finalOffer =
          preApprovalResponse.data.offer || preApprovalResponse.data.limit || 0;

        // Set message from Pre-Approval API. Use a generic message only as a last resort.
        if (preApprovalResponse.data.message) {
          finalmessage = preApprovalResponse.data.message;
          router.post("/zypewebapi", async (req, res) => {
            const phone = req.body.phone;
            let eligibilityResponse = null;
            let preApprovalResponse = null;

            // Final Status, Offer, and Message
            let finalStatus = "FAILED";
            let finalOffer = 0;
            // Set initial message to null/undefined so we ONLY use API messages
            let finalmessage = null;

            try {
              const { email, panNumber, name, dob, income, employmentType } =
                req.body;

              // --- 1. Basic Validation ---
              if (
                !phone ||
                !email ||
                !panNumber ||
                !name ||
                !dob ||
                !income ||
                !employmentType
              ) {
                finalmessage = "All required fields were not provided.";
                return res.status(400).json({
                  message: finalmessage,
                  status: "VALIDATION_FAILED",
                  offer: 0,
                });
              }

              // --- 2. Zype Eligibility API Call ---
              eligibilityResponse = await axios.post(
                "https://prod.zype.co.in/attribution-service/api/v1/underwriting/customerEligibility",
                {
                  mobileNumber: phone,
                  panNumber,
                  partnerId: "a8ce06a0-4fbd-489f-8d75-345548fb98a8",
                },
                {
                  headers: { "Content-Type": "application/json" },
                },
              );

              // Set Status and Message from Eligibility Response
              finalStatus = eligibilityResponse.data.status;
              finalmessage = eligibilityResponse.data.message;

              // --- 3. Conditional Pre-Approval Logic ---
              if (eligibilityResponse.data.status === "ACCEPT") {
                // --- 3a. Duplicate Check (RefArr: Zype) ---
                const existingRef = await User.findOne({
                  phone: phone,
                  "RefArr.name": "Zype",
                });

                if (existingRef) {
                  // If Duplicate, use saved values from DB
                  console.log(
                    `⚠️ User ${phone} already hit Zype. Skipping Pre-Approval API.`,
                  );
                  finalStatus = "DUPLICATE";
                  finalOffer = existingRef.offer || 0;
                  // Use the message saved in the DB. If that's null, use a generic message.
                  finalmessage =
                    existingRef.message || "Duplicate application detected.";
                } else {
                  // --- 3b. Call Pre-Approval API (Only if eligible and not duplicate) ---
                  preApprovalResponse = await axios.post(
                    "https://prod.zype.co.in/attribution-service/api/v1/underwriting/preApprovalOffer",
                    {
                      mobileNumber: phone,
                      email,
                      panNumber,
                      name,
                      dob,
                      income,
                      employmentType,
                      partnerId: "a8ce06a0-4fbd-489f-8d75-345548fb98a8",
                      bureauType: 1,
                      bureauName: "experian",
                      bureauData: "<BureauSampleDataInXMLText>",
                    },
                    {
                      headers: { "Content-Type": "application/json" },
                    },
                  );

                  // Update Status, Offer, and Message from Pre-Approval response
                  finalStatus = preApprovalResponse.data.status;
                  finalOffer =
                    preApprovalResponse.data.offer ||
                    preApprovalResponse.data.limit ||
                    0;
                  // Set message from Pre-Approval API. If API message is empty/null, use a generic ACCEPT/REJECT message.
                  if (preApprovalResponse.data.message) {
                    finalmessage = preApprovalResponse.data.message;
                  } else {
                    // Custom message ONLY used as fallback if API returns ACCEPT but no message
                    finalmessage =
                      finalStatus === "ACCEPT"
                        ? "Data saved successfully"
                        : "Pre-approval check complete.";
                  }
                }
              } else {
                // If status is REJECT/REFER from Eligibility, message is already set in Step 2.
                finalOffer = 0;
              }

              const zypeApiRespone = {
                eligibility: eligibilityResponse.data,
                preApproval: preApprovalResponse
                  ? preApprovalResponse.data
                  : null,
              };

              const apiResponseEntry = {
                Zype: zypeApiRespone,
                createdAt: new Date().toLocaleString(),
              };

              const refArrEntry = {
                name: "Zype",
                createdAt: new Date().toLocaleString(),
              };

              const updateDoc = {
                $push: {
                  apiResponse: apiResponseEntry,
                  RefArr: refArrEntry,
                },
                $set: {
                  phone: phone,
                  email,
                  panNumber,
                  name,
                  dob,
                  income,
                  employmentType,
                  status: finalStatus,
                  offer: finalOffer,
                  message: finalmessage,
                },
                $unset: { accounts: "" },
              };

              // --- 5. DB Update (User) ---
              await User.updateOne({ phone: phone }, updateDoc, {
                upsert: true,
              });
              console.log(
                `✅ User document updated/inserted for attempt: ${phone} with status: ${finalStatus}`,
              );

              const saveData = new WebRamfin({
                phone: phone,
                email,
                panNumber,
                name,
                dob,
                income,
                employmentType,
                status: finalStatus,
                offer: finalOffer,
                message: finalmessage,
                apiResponse: [apiResponseEntry],
                RefArr: [refArrEntry],
              });

              await saveData.save();
              console.log("✅ Log document saved to WebRamfin.");

              return res.status(200).json({
                message: finalmessage,
                status: finalStatus,
                offer: finalOffer,
              });
            } catch (error) {
              console.error(
                `Zype API Error for ${phone}:`,
                error.response?.data || error.message,
              );

              const errorMessageForUser =
                error.response?.data?.message ||
                "An external API error occurred.";

              res.status(500).json({
                error: errorMessageForUser,
              });
            }
          });
        } else {
          finalmessage =
            finalStatus === "ACCEPT"
              ? "Data saved successfully"
              : "Pre-approval check complete.";
        }
      }
    } else {
      finalOffer = 0;
    }

    const zypeApiRespone = {
      eligibility: eligibilityResponse.data,
      preApproval: preApprovalResponse ? preApprovalResponse.data : null,
    };

    const apiResponseEntry = {
      Zype: zypeApiRespone,
      createdAt: new Date().toLocaleString(),
    };
    const refArrEntry = {
      name: "Zype",
      createdAt: new Date().toLocaleString(),
    };

    const updateDoc = {
      $push: { apiResponse: apiResponseEntry, RefArr: refArrEntry },
      $set: {
        phone: phone,
        email,
        panNumber,
        name,
        dob,
        income,
        employmentType,
        status: finalStatus,
        offer: finalOffer,
        message: finalmessage,
      },
      $unset: { accounts: "" },
    };

    await User.updateOne({ phone: phone }, updateDoc, { upsert: true });
    console.log(
      `✅ User document updated/inserted for attempt: ${phone} with status: ${finalStatus}`,
    );

    const saveData = new WebRamfin({
      phone,
      email,
      panNumber,
      name,
      dob,
      income,
      employmentType,
      status: finalStatus,
      offer: finalOffer,
      message: finalmessage,
      apiResponse: [apiResponseEntry],
      RefArr: [refArrEntry],
    });

    await saveData.save();
    console.log("✅ Log document saved to WebRamfin.");

    // --- 7. Final Success Response ---
    return res.status(200).json({
      message: finalmessage,
      status: finalStatus,
      offer: finalOffer,
    });
  } catch (error) {
    // --- Handle Zype API / DB Errors ---
    console.error(
      `Zype API Error for ${phone}:`,
      error.response?.data || error.message,
    );

    // Use the error message returned by Zype API on failure, or a generic 500 message.
    const errorMessageForUser =
      error.response?.data?.message || "An external API error occurred.";

    res.status(500).json({
      error: errorMessageForUser,
    });
  }
});

router.get("/MoneyView", async (req, res) => {
  console.log("MoneyView");
});

router.post("/partner/page", async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      contact,
      natureofbusiness,
      profile,
      products,
      bussinessvolume,
      website,
      pincode,
      soucreoflocation,
      partnerType,
    } = req.body;

    if (!["DSA", "Aggregator", "Other"].includes(partnerType)) {
      return res.status(400).json({ message: "Invalid partner type" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: process.env.EMAIL,
      subject: "New Partner Request",
      html: `
        <h2>📩 New Partner Request Received</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Contact:</strong> ${contact}</p>
        <p><strong>Partner Type:</strong> ${partnerType}</p>
        <p><strong>Nature of Business:</strong> ${natureofbusiness}</p>
        <p><strong>Profile:</strong> ${profile}</p>
        <p><strong>Products:</strong> ${products}</p>
        <p><strong>Business Volume:</strong> ${bussinessvolume}</p>
        <p><strong>Website:</strong> ${website}</p>
        <p><strong>Pincode:</strong> ${pincode}</p>
        <p><strong>Source of Location:</strong> ${soucreoflocation}</p>
        <p><em>This request came from the partner page form.</em></p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Partner request received. Email sent!" });
  } catch (error) {
    console.error("❌ Error sending partner email:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

const getAtlasToken = async () => {
  try {
    const tokenRes = await axios.post(
      "https://atlas.whizdm.com/atlas/v1/token",
      {
        userName: "keshvacredit",
        password: "Zb'91O(Nhy",
        partnerCode: 422,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const token = tokenRes.data.token;
    return token;
  } catch (err) {
    console.error(
      "❌ Error while getting token:",
      err?.response?.data || err.message,
    );
    throw new Error("Token fetch failed");
  }
};
router.post("/check-leads", async (req, res) => {
  const { leadIds } = req.body;

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "leadIds array is required in request body",
    });
  }

  try {
    // 🔐 Get token from Atlas
    const token = await getAtlasToken();

    // 🔄 Fetch lead status for each lead ID
    const results = await Promise.all(
      leadIds.map(async (leadId) => {
        try {
          const response = await axios.get(
            `https://atlas.whizdm.com/atlas/v1/lead/status/${leadId}`,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            },
          );

          return {
            leadId,
            success: true,
            fullResponse: response.data,
          };
        } catch (err) {
          return {
            leadId,
            success: false,
            statusCode: err?.response?.status || 500,
            error:
              typeof err?.response?.data === "string" &&
              err.response.data.includes("<html")
                ? "Internal Server Error from Atlas (HTML page received)"
                : err?.response?.data || err.message,
          };
        }
      }),
    );

    const expiredCount = results.filter(
      (r) => r.success && r.status === "expired",
    ).length;

    res.status(200).json({
      success: true,
      totalLeads: leadIds.length,
      expiredCount,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while fetching data",
      error: error.message,
    });
  }
});
router.post("/final-loan-details", async (req, res) => {
  const { leadIds } = req.body;

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "leadIds array is required in request body",
    });
  }

  try {
    // 🔐 Get token from Atlas
    const token = await getAtlasToken();

    // 🔄 Fetch lead status for each lead ID
    const results = await Promise.all(
      leadIds.map(async (leadId) => {
        try {
          const response = await axios.get(
            `https://atlas.whizdm.com/atlas/v1/lead/final-loan-details/${leadId}`,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            },
          );

          return {
            leadId,
            success: true,
            fullResponse: response.data,
          };
        } catch (err) {
          return {
            leadId,
            success: false,
            statusCode: err?.response?.status || 500,
            error:
              typeof err?.response?.data === "string" &&
              err.response.data.includes("<html")
                ? "Internal Server Error from Atlas (HTML page received)"
                : err?.response?.data || err.message,
          };
        }
      }),
    );

    const expiredCount = results.filter(
      (r) => r.success && r.status === "expired",
    ).length;

    res.status(200).json({
      success: true,
      totalLeads: leadIds.length,
      expiredCount,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while fetching data",
      error: error.message,
    });
  }
});

router.post("/getBL", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Await is important
    const user = await BL.findOne({ phone }).lean(); // .lean() returns plain JS object

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user); // safe to send
  } catch (error) {
    console.error("❌ Error fetching user:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

const IMAGE_FOLDER = path.join(__dirname, "../festival");

router.get("/festivalImg", (req, res) => {
  try {
    const files = fs.readdirSync(IMAGE_FOLDER).filter((file) => {
      // Only image files
      return (
        file.endsWith(".png") || file.endsWith(".jpg") || file.endsWith(".jpeg")
      );
    });

    if (files.length === 0) {
      return res.status(404).json({ message: "No images found" });
    }

    // Sort by creation time (latest first)
    const sorted = files
      .map((file) => ({
        name: file,
        time: fs.statSync(path.join(IMAGE_FOLDER, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    const latestImage = sorted[0].name;
    const imagePath = path.join(IMAGE_FOLDER, latestImage);

    console.log("🖼️ Sending image:", latestImage);

    return res.sendFile(imagePath);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error reading folder" });
  }
});

router.post("/HomeLoan", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  try {
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Create HomeLoan entry from User data
    const homeLoan = new HomeLoan({
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      state: user.state,
      income: user.income,
      pincode: user.pincode,
      loanAmount: user.loanAmount,
      employmentType: user.employmentType,
      dob: user.dob,
      pan: user.panNumber, // fixed field name from "panel"
    });

    await homeLoan.save();

    // ✅ Return success response
    return res.status(201).json({
      status: "success",
      message: "User data saved to HomeLoan successfully",
      homeLoan,
    });
  } catch (error) {
    console.error("❌ Error saving HomeLoan:", error.message);
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
});

router.post("/utmHistory", async (req, res) => {
  try {
    const { phone, utmSource } = req.body;

    if (!phone || !utmSource) {
      return res.status(400).json({
        message: "Phone number and utmSource (URL/Name) are required.",
      });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        message: "User not found with the provided phone number.",
      });
    }

    const utmHistoryEntry = {
      utm_source: utmSource,
      date: new Date(),
    };

    if (!user.utm_history) {
      user.utm_history = [];
    }

    user.utm_history.push(utmHistoryEntry);

    await user.save();

    return res.status(200).json({
      message: "UTM history updated successfully with name and date.",
    });
  } catch (error) {
    console.error("UTM History Update Error:", error);
    return res.status(500).json({
      message: "Internal server error during history update.",
    });
  }
});

module.exports = router;
