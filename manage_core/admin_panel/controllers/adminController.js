const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();
const bcrypt = require("bcrypt");
const Member = require("../../models/Member");
const {
  sendAdminLoginAlert,
  sendAdminCreatedAlert,
} = require("./mailverify.js");
exports.login = (req, res) => {
  const { adminMail, password } = req.body;

  const adminDataPath = path.join(__dirname, "../data/admin.json");
  const adminData = JSON.parse(fs.readFileSync(adminDataPath, "utf-8"));

  if (adminMail === adminData.adminMail && password === adminData.password) {
    const token = jwt.sign(
      { role: "admin", username: adminMail },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    sendAdminLoginAlert(adminMail);
    res.json({ message: "✅ Admin logged in", token });
  } else {
    res.status(401).json({ message: "❌ Invalid admin credentials" });
  }
};

exports.dashboard = (req, res) => {
  res.send("✅ Welcome to Admin Dashboard");
};

exports.createUser = async (req, res) => {
  const { username, userMail, password } = req.body;

  try {
    if (!userMail || !username || !password) {
      return res.status(400).json({ message: "❌ Missing fields" });
    }

    const existing = await Member.findOne({ userMail });
    if (existing) {
      return res.status(400).json({ message: "❌ Member already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const member = new Member({ username, userMail, password: hashedPassword });
    await member.save();

    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const createdBy = decoded.username || "unknown";

    console.log("📧 Sending alert >>", createdBy, userMail);
    await sendAdminCreatedAlert(createdBy, userMail);

    res.json({ message: "✅ Member created securely" });
  } catch (error) {
    console.error("❌ Error creating member:", error);
    res.status(500).json({ message: "❌ Server error" });
  }
};
