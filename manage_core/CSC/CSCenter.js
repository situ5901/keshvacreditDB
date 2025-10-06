const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { CSCmodel } = require("../CSC/CSCschema.js");
const { CsCenter } = require("../CSC/CSCschema.js");
const User = require("../../models/user.model.js");
const generateUsername = async (firstName) => {
  const baseName = firstName.toLowerCase().replace(/\s+/g, "");
  let username = `${baseName}${Math.floor(1000 + Math.random() * 9000)}`;
  while (await CsCenter.findOne({ username })) {
    username = `${baseName}${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return username;
};

exports.test = async (req, res) => {
  return res.status(200).json({ message: "✅ Test API" });
};

exports.register = async (req, res) => {
  try {
    const {
      firstName,
      phone,
      email,
      password,
      Aadhar,
      PAN,
      CenterName,
      location,
      accountNumber,
      bankName,
      IFSC,
    } = req.body;

    if (!firstName || !phone || !password) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const existingUser = await CsCenter.findOne({
      $or: [{ phone }, { email }],
    });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "Phone or email already registered" });
    }

    const username = await generateUsername(firstName);

    const hashedPassword = await bcrypt.hash(password, 10);

    const payload = {
      firstName,
      username,
      phone,
      email,
      Aadhar,
      PAN,
      CenterName,
      location,
      accountNumber,
      bankName,
      IFSC,
      password: hashedPassword, // Store hashed password
    };

    const user = new CsCenter(payload);
    await user.save();

    const userDoc = user._doc;
    delete userDoc.password;

    return res.status(201).json({
      message: "User registered successfully",
      user: userDoc,
    });
  } catch (error) {
    console.error("Error registering user:", error.message);
    return res.status(400).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await CSCmodel.findOne({
      $or: [{ cscName: username }, { cscMail: email }, { cscMail: username }],
    }).select("+cscPassword");

    if (!user) {
      return res
        .status(401)
        .json({ error: "Invalid credentials (User not found)" });
    }

    if (!user.cscPassword) {
      console.error(
        `User ${email} found, but cscPassword is missing in the retrieved document.`,
      );
      return res
        .status(500)
        .json({ error: "Server error (Missing password hash)" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.cscPassword);

    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ error: "Invalid credentials (Password mismatch)" });
    }
    return res.json({
      role: "csc",
      message: "CSC partner logged in",
      username: user.cscName, // Use cscName if that's the name field
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.getUserDetail = async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const isPhone = /^\d{10}$/.test(identifier);
    const query = isPhone ? { phone: identifier } : { username: identifier };

    const user = await CSCmodel.findOne(query).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (err) {
    console.error("Fetch error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { username } = req.params;
    const updates = { ...req.body };
    delete updates.username;
    delete updates.password;

    const user = await CSCmodel.findOneAndUpdate(
      { username },
      { $set: updates },
      { new: true, runValidators: true }, // Return updated document and run schema validators
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      message: "User updated successfully",
      user,
    });
  } catch (err) {
    console.error("Update error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.getCPartnerDatabyID = async (req, res) => {
  const { agent_id } = req.body;

  if (!agent_id) {
    return res.status(400).json({ error: "Please enter center ID" });
  }

  try {
    const user = await User.find({ agent_id: agent_id });

    if (!user) {
      return res
        .status(404)
        .json({ error: "User not found with this center ID" });
    }
    const count = await User.countDocuments({ agent_id: agent_id });

    return res.status(200).json({
      message: "Data retrieved successfully",
      match_count: count, // Added the count
      user_data: user, // Renamed 'user' to 'user_data' for clarity
    });
  } catch (err) {
    console.error("Data retrieval error:", err.message);
    return res
      .status(500)
      .json({ error: "Server error during data retrieval" });
  }
};

exports.addAmount = async (req, res) => {
  try {
    const { username } = req.params;
    const { addAmount } = req.body; // Expects: { "addAmount": 500 }

    if (typeof addAmount !== "number") {
      return res.status(400).json({ error: "addAmount must be a number" });
    }

    const user = await CSCmodel.findOneAndUpdate(
      { username },
      { $inc: { amount: addAmount } },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      message: "Amount added successfully",
      user,
    });
  } catch (err) {
    console.error("Add amount error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};
