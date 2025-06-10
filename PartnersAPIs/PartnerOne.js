const express = require("express");
const router = express.Router();
const { partnerdb, customer } = require("../PartnersAPIs/PartnerSchema");

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const AUTH_KEY = "situ5901NiIsInR5cCI6IkpXVCJ9";
const VALID_PARTNER_ID = "Moneyase-keshva";

router.post("/create_apis", async (req, res) => {
  try {
    const authKey = req.headers["authorization"];
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
      income,
      dob,
      partner_Id,
    } = req.body;

    if (
      !name ||
      !phone ||
      !email ||
      !employeeType ||
      !pan ||
      !pincode ||
      !income ||
      !dob ||
      !partner_Id
    ) {
      return res
        .status(400)
        .json({ status: 400, error: "Missing required fields" });
    }

    if (partner_Id !== VALID_PARTNER_ID) {
      return res
        .status(403)
        .json({ status: 403, error: "Invalid partner_Id. Access denied." });
    }

    if (!panRegex.test(pan)) {
      return res.status(400).json({ status: 400, error: "Invalid PAN format" });
    }

    const userInCustomer = await customer.findOne({ phone, pan });
    const userInPartnerdb = await partnerdb.findOne({ phone, pan });

    if (userInCustomer || userInPartnerdb) {
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
      pincode,
      income,
      dob,
      partner_Id,
    });

    try {
      await newUser.save();
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({
          status: 409,
          error: "Duplicate data found. User already exists.",
        });
      }
      throw err;
    }

    return res.status(201).json({
      status: 201,
      message: "User details received successfully!",
      user: newUser,
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ status: 500, error: "Server error" });
  }
});

module.exports = router;
