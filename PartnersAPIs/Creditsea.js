const express = require("express");
const router = express.Router();
const { partnerdb, customer } = require("../PartnersAPIs/PartnerSchema");

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const {
  AUTH_KEY,
  VALID_PARTNER_ID,
  AUTH_KEY_ZYPE,
  VALID_ZYPE_ID,
  AUTH_CASHKUBER_kEY,
  VALID_CASHKUBER_ID,
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
      creditScore,
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
      creditScore,
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
      creditScore,
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
      creditScore,
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

router.post("/cashkuber/create", async (req, res) => {
  try {
    const authheader = req.headers["authorization"];
    const authkey = authheader?.replace(/^bearer\s+/i, "");

    if (!authkey || authkey !== auth_cashkuber_key) {
      return res.status(401).json({ status: 401, error: "unauthorized" });
    }

    const {
      name,
      phone,
      email,
      employeetype,
      pan,
      pincode,
      state,
      city,
      income,
      dob,
      creditscore,
      partner_id,
    } = req.body;

    const requiredfields = {
      name,
      phone,
      email,
      employeetype,
      pan,
      pincode,
      state,
      city,
      income,
      dob,
      creditscore,
      partner_id,
    };

    const missingfields = object
      .entries(requiredfields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingfields.length > 0) {
      return res.status(400).json({
        status: 400,
        error: `missing required fields: ${missingfields.join(", ")}`,
      });
    }

    if (partner_id !== valid_cashkuber_id) {
      return res.status(403).json({
        status: 403,
        error: "invalid partner_id. access denied.",
      });
    }

    if (!panregex.test(pan)) {
      return res.status(400).json({
        status: 400,
        error: "invalid pan format",
      });
    }

    const [userincustomer, userinpartner] = await promise.all([
      customer.findone({ phone, pan }),
      partnerdb.findone({ phone, pan }),
    ]);

    if (userincustomer || userinpartner) {
      return res.status(409).json({
        status: 409,
        error: "user is already associated with us",
      });
    }

    const newuser = new partnerdb({
      name,
      phone,
      email,
      employeetype,
      pan,
      state,
      city,
      pincode,
      income,
      dob,
      creditscore,
      partner_id,
    });

    await newuser.save();

    return res.status(201).json({
      status: 201,
      message: "user created",
      user: newuser,
    });
  } catch (err) {
    console.error("server error:", err);
    return res.status(500).json({ status: 500, error: "server error" });
  }
});

module.exports = router;
