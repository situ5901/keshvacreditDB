const Member = require("../../models/Member");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
require("dotenv").config();

// ✅ User Login
exports.login = async (req, res) => {
  const { Membername, MemberMail, MemberPassword } = req.body;

  if (!Membername || !MemberMail || !MemberPassword) {
    return res.status(400).json({
      status: false,
      message: "❌ Membername, MemberMail aur MemberPassword sab required hai",
    });
  }

  try {
    // 🔍 User ko dhundo jiska name & mail match kare
    const user = await Member.findOne({ Membername, MemberMail });

    // ❌ Agar user nahi mila
    if (!user) {
      return res.status(401).json({ message: "❌ Name ya Email galat hai" });
    }

    // 🔐 Password match karo
    const passwordMatch = await bcrypt.compare(
      MemberPassword,
      user.MemberPassword,
    );

    if (!passwordMatch) {
      return res.status(401).json({ message: "❌ Password galat hai" });
    }

    // ✅ Sab match ho gya -> Token generate karo
    const token = jwt.sign(
      {
        role: "Member",
        userId: user._id,
        Membername: user.Membername,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    return res.status(200).json({
      status: true,
      role: "Member",
      message: "✅ Login successful",
      token,
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({ message: "❌ Server error" });
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
