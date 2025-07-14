const Member = require("../../models/Member");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
require("dotenv").config();

// ✅ User Login
exports.login = async (req, res) => {
  const { Membername, MemberMail, MemberPassword } = req.body;

  try {
    // 🔍 Find user by email or username
    const user = await Member.findOne({
      $or: [{ MemberMail }, { Membername }],
    });

    if (!user) {
      return res.status(401).json({ message: "❌ Invalid email or username" });
    }

    // 🔐 Compare password
    const passwordMatch = await bcrypt.compare(
      MemberPassword,
      user.MemberPassword,
    );

    if (!passwordMatch) {
      return res.status(401).json({ message: "❌ Invalid password" });
    }

    // 🔑 Generate token
    const token = jwt.sign(
      {
        role: "Member",
        userId: user._id,
        Membername: user.Membername,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // ✅ Send login success response
    res.status(200).json({
      status: true,
      role: "Member",
      message: "✅ User logged in securely",
      token,
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "❌ Server error" });
  }
};

// ✅ User Dashboard
exports.dashboard = (req, res) => {
  res.send(`✅ Welcome ${req.user.username}, this is your dashboard`);
};
