const mongoose = require("mongoose");
const router = require("express").Router();
const BLSchema = require("./BLSchema.js");

router.post("/form", async (req, res) => {
  const {
    name,
    phone,
    email,
    loanAmount,
    gender,
    companyType,
    selfEmployedProfessional,
    pan,
    dob,
    businessName,
    gstRegistered,
    businessAge,
    annualTurnover,
    pincode,
    currentAccount,
  } = req.body;
  //udpate
  const existingUser = await BLSchema.findOne({
    $or: [{ phone }, { email }],
  });
  if (existingUser) {
    return res.status(409).json({
      status: 409,
      error: "User with this phone or email already exists",
    });
  }
  const newUser = new BLSchema({
    name,
    phone,
    email,
    loanAmount,
    gender,
    companyType,
    selfEmployedProfessional,
    pan,
    dob,
    businessName,
    gstRegistered,
    businessAge,
    annualTurnover,
    pincode,
    currentAccount,
  });
  const savedUser = await newUser.save();
  res.status(201).json({
    status: "success",
    message: "User information saved successfully",
    user: savedUser,
  });
});
module.exports = router;
