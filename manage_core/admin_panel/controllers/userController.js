const Member = require("../../models/Member");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// ✅ User Login
exports.login = async (req, res) => {
  const { userId, password } = req.body;

  try {
    const user = await Member.findOne({ userId });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "❌ Invalid credentials" });
    }

    const token = jwt.sign({ role: "user", userId }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ message: "✅ User logged in", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "❌ Server error" });
  }
};

// ✅ User Dashboard
exports.dashboard = (req, res) => {
  res.send(`✅ Welcome ${req.user.userId}, this is your dashboard`);
};
