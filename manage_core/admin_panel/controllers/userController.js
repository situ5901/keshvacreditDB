const Member = require("../../models/Member");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
require("dotenv").config();

// ✅ User Login
exports.login = async (req, res) => {
  const { Membername, MemberMail, MemberPassword } = req.body;

  try {
    const user = await Member.findOne({
      $or: [{ MemberMail }, { Membername }, { MemberPassword }],
    });

    if (!user) {
      return res
        .status(401)
        .json({ message: "❌ Invalid email username or password" });
    }
    const passwordMatch = await bcrypt.compare(
      MemberPassword,
      user.MemberPassword,
    );

    if (!passwordMatch) {
      return res.status(401).json({ message: "❌ Invalid password" });
    }

    const token = jwt.sign(
      {
        role: "Member",
        userId: user._id,
        Membername: user.Membername,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

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

exports.getMamber = async (req, res) => {
  try {
    const allMembers = await Member.find();
    if (allMembers.length > 0) {
      res.status(200).json(allMembers);
    } else {
      res.status(404).json({ message: "❌ No Members found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "❌ Failed to fetch members", error: error.message });
  }
};
