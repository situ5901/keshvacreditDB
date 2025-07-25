const express = require("express");
const router = express.Router();
const { partnerdb, customer } = require("../PartnersAPIs/PartnerSchema");

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const {
  AUTH_KEY,
  VALID_PARTNER_ID,
  AUTH_KEY_ZYPE,
  VALID_ZYPE_ID,
} = require("../config/partnerConf.js");

router.get("/testdeno", async (req, res) => {
  res.send("Hello World!");
});

router.post("/create_apis", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const authKey = authHeader?.replace(/^Bearer\s+/i, "");
    if (!authKey || authKey !== AUTH_KEY) {
      return res.status(401).json({ status: 401, error: "Unauthorized" });
    }

    const {
      name,
      phone,
      email,
      employeeType,
      pan,
      pincode,
      state,
      city,
      income,
      dob,
      partner_Id,
    } = req.body;

    const requiredFields = {
      name,
      phone,
      email,
      employeeType,
      pan,
      pincode,
      state,
      city,
      income,
      dob,
      partner_Id,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 400,
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    if (partner_Id !== VALID_PARTNER_ID) {
      return res
        .status(403)
        .json({ status: 403, error: "Invalid partner_Id. Access denied." });
    }

    if (!panRegex.test(pan)) {
      return res.status(400).json({ status: 400, error: "Invalid PAN format" });
    }

    const [userInCustomer, userInPartner] = await Promise.all([
      customer.findOne({ phone, pan }),
      partnerdb.findOne({ phone, pan }),
    ]);

    if (userInCustomer || userInPartner) {
      return res
        .status(409)
        .json({ status: 409, error: "User is already associated with us" });
    }

    const newUser = new partnerdb({
      name,
      phone,
      email,
      employeeType,
      pan,
      state,
      city,
      pincode,
      income,
      dob,
      partner_Id,
    });

    await newUser.save();

    return res
      .status(201)
      .json({ status: 201, message: "User created", user: newUser });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        status: 409,
        error: "Duplicate data found. User already exists.",
      });
    }
    console.error("❌ Server Error:", err);
    return res.status(500).json({ status: 500, error: "Server error" });
  }
});

router.post("/zype/create", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const authKey = authHeader?.replace(/^Bearer\s+/i, "");

    if (!authKey || authKey !== AUTH_KEY_ZYPE) {
      return res.status(401).json({ status: 401, error: "Unauthorized" });
    }

    const {
      name,
      phone,
      email,
      employeeType,
      pan,
      state,
      city,
      pincode,
      income,
      dob,
      partner_Id,
    } = req.body;

    const requiredFields = {
      name,
      phone,
      email,
      employeeType,
      pan,
      state,
      city,
      pincode,
      income,
      dob,
      partner_Id,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 400,
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    if (partner_Id !== VALID_ZYPE_ID) {
      return res.status(403).json({
        status: 403,
        error: "Invalid partner_Id. Access denied.",
      });
    }

    if (!panRegex.test(pan)) {
      return res.status(400).json({
        status: 400,
        error: "Invalid PAN format",
      });
    }

    const [userInCustomer, userInPartner] = await Promise.all([
      customer.findOne({ phone, pan }),
      partnerdb.findOne({ phone, pan }),
    ]);

    if (userInCustomer || userInPartner) {
      return res.status(409).json({
        status: 409,
        error: "User is already associated with us",
      });
    }

    const newUser = new partnerdb({
      name,
      phone,
      email,
      employeeType,
      pan,
      state,
      city,
      pincode,
      income,
      dob,
      partner_Id,
    });

    await newUser.save();

    return res.status(201).json({
      status: 201,
      message: "Zype partner user created successfully!",
      user: newUser,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        status: 409,
        error: "Duplicate data found. User already exists.",
      });
    }

    console.error("Server Error:", err);
    return res.status(500).json({ status: 500, error: "Server error" });
  }
});

module.exports = router;
