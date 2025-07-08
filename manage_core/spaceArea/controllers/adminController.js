const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

exports.dashboard = (req, res) => {
  const { adminId, adminPass } = req.body;

  if (!adminId || !adminPass) {
    return res.status(400).json({ message: "⛔ ID & Password required" });
  }

  const adminDataPath = path.join(__dirname, "../data/admin.json");
  const rawData = fs.readFileSync(adminDataPath);
  const adminData = JSON.parse(rawData);

  if (adminId === adminData.username && adminPass === adminData.password) {
    const token = jwt.sign(
      { role: "admin", id: adminId },
      process.env.JWT_SECRET,
      { expiresIn: "2h" },
    );

    return res.status(200).json({
      message: "✅ Login successful",
      token: token,
    });
  } else {
    return res.status(401).json({ message: "⛔ Invalid credentials" });
  }
};
