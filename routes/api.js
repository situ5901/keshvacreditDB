const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model"); // Ensure correct path
const Lead = require("../models/RamFinSch");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
require("dotenv").config();

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
    const smsUrl = `https://web.smscloud.in/api/pushsms?user=KESHVACREDIT&authkey=7lbTOubf0YBuTFtuCPmMB1AIclEzjQk8&sender=KVcred&mobile=${phone}&text=${encodeURIComponent(message)}&templateid=1707174409184160229&rpt=1`;

    const response = await axios.get(smsUrl);

    console.log("✅ OTP:", otp);
    res.status(200).json({
      status: "Success",
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("❌ SMS Error:", error.response?.data || error.message);
    res.status(500).json({
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
      employeeType,
      pan,
      pincode,
      loanAmount,
      income,
      salaryMode,
      bankName,
      salarySlip,
      state,
      city,
      businessName,
      businessType,
      doesFileITR,
      doesFileGST,
      dob, // fixed
    } = req.body;

    let missingFields = [];
    if (!name) missingFields.push("name");
    if (!phone) missingFields.push("phone");
    if (!email) missingFields.push("email");
    if (!employeeType) missingFields.push("employeeType");
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
      employeeType,
      pan: pan.toUpperCase(), // save uppercase PAN
      pincode,
      loanAmount,
      income,
      salaryMode,
      state,
      city,
      bankName,
      businessName,
      businessType,
      salarySlip,
      dob,
      doesFileITR,
      doesFileGST,
      partner: "Keshvacredit",
      consent:
        "We value your privacy. To proceed, we need your consent to collect and process your personal data, such as name, phone number, and PAN details.By continuing, you agree to our Privacy Policy and Terms & Conditions.",
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
      { mobile: phone }, // yahan mobile likha
      { $set: req.body }, // jitna bhi data aaye sab update ho
      { new: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
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
  mobileNumber: String,
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

// API Route
router.post("/zypewebapi", async (req, res) => {
  try {
    const {
      mobileNumber,
      email,
      panNumber,
      name,
      dob,
      income,
      employmentType,
      orgName,
    } = req.body;

    // ✅ Basic validation
    if (
      !mobileNumber ||
      !email ||
      !panNumber ||
      !name ||
      !dob ||
      !income ||
      !employmentType ||
      !orgName
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ First API: customerEligibility
    const eligibilityResponse = await axios.post(
      "https://prod.zype.co.in/attribution-service/api/v1/underwriting/customerEligibility",
      {
        mobileNumber,
        panNumber,
        partnerId: "a8ce06a0-4fbd-489f-8d75-345548fb98a8",
      },
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    // ✅ Check if eligible
    if (eligibilityResponse.data.status !== "ACCEPT") {
      return res.status(200).json({
        message: "Customer not eligible",
        status: eligibilityResponse.data.status,
      });
    }

    // ✅ Second API: preApprovalOffer
    const preApprovalResponse = await axios.post(
      "https://prod.zype.co.in/attribution-service/api/v1/underwriting/preApprovalOffer",
      {
        mobileNumber,
        email,
        panNumber,
        name,
        dob,
        income,
        employmentType,
        orgName,
        partnerId: "a8ce06a0-4fbd-489f-8d75-345548fb98a8",
        bureauType: 1,
        bureauName: "experian",
        bureauData: "<BureauSampleDataInXMLText>",
      },
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    const { status, offer } = preApprovalResponse.data;

    // ✅ Save to DB
    const saveData = new WebRamfin({
      mobileNumber,
      email,
      panNumber,
      name,
      dob,
      income,
      employmentType,
      orgName,
      status,
      offer,
    });

    await saveData.save();

    // ✅ Return response
    res.status(200).json({
      message: "Data saved successfully",
      status,
      offer,
    });
  } catch (error) {
    console.error("Zype API Error:", error.response?.data || error.message);
    res.status(500).json({
      message: "Error processing request",
      error: error.response?.data || error.message,
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
            status: response.data.status || "unknown",
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
module.exports = router;
