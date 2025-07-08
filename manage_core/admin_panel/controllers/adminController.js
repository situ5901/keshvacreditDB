const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const Member = require("../../../manage_core/admin_panel/models/Member.js");

// ✅ Admin Login Function
exports.login = (req, res) => {
  const { username, password } = req.body;

  // Load JSON file containing admin credentials
  const adminDataPath = path.join(__dirname, "../data/admin.json");
  const adminData = JSON.parse(fs.readFileSync(adminDataPath, "utf-8"));

  if (username === adminData.username && password === adminData.password) {
    // Generate dynamic JWT token
    const token = jwt.sign(
      { role: "admin", username },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    res.json({ message: "✅ Admin logged in", token });
  } else {
    res.status(401).json({ message: "❌ Invalid admin credentials" });
  }
};

// ✅ Admin Dashboard
exports.dashboard = (req, res) => {
  res.send("✅ Welcome to Admin Dashboard");
};

// ✅ Create Member/User
exports.createUser = async (req, res) => {
  const { userId, password } = req.body;

  try {
    const existing = await Member.findOne({ userId });
    if (existing) {
      return res.status(400).json({ message: "❌ Member already exists" });
    }

    const member = new Member({ userId, password });
    await member.save();

    res.json({ message: "✅ Member created successfully" });
  } catch (error) {
    console.error("❌ Error creating member:", error);
    res.status(500).json({ message: "❌ Server error" });
  }
};
