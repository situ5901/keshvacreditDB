const Member = require("../../models/Member");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
require("dotenv").config();

// ✅ User Login
exports.login = async (req, res) => {
  const { username, userMail, password } = req.body;

  try {
    // 🔍 Find user with both email and username
    const user = await Member.findOne({ userMail, username });

    if (!user) {
      return res.status(401).json({ message: "❌ Invalid email or username" });
    }

    // 🔐 Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "❌ Invalid password" });
    }

    // 🔑 Generate token (using _id is more reliable than user.userId)
    const token = jwt.sign(
      {
        role: "user",
        userId: user._id, // ✅ Use MongoDB's default _id
        username: user.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // 📧 Optional: Send email on login
    /*
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"User Login Alert" <${process.env.EMAIL}>`,
      to: process.env.EMAIL,
      subject: "🚨 User Login Detected",
      html: `<h3>User Login Successful</h3>
             <p><strong>Username:</strong> ${username}</p>
             <p><strong>Email:</strong> ${userMail}</p>
             <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ User login alert email sent: ${userMail}`);
    */

    // ✅ Send login success response
    res.status(200).json({
      status: true,
      role: "Member",
      message: "✅ User logged in securely",
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "❌ Server error" });
  }
};

// ✅ User Dashboard
exports.dashboard = (req, res) => {
  res.send(`✅ Welcome ${req.user.username}, this is your dashboard`);
};
