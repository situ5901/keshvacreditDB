const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();
const bcrypt = require("bcrypt");
const Member = require("../../models/Member");
const AgentModel = require("../../models/AgentModel.js");
// const {
//   sendAdminLoginAlert,
//   sendAdminCreatedAlert,
// } = require("./mailverify.js");
exports.login = (req, res) => {
  const { adminName, adminMail, password } = req.body;

  const adminDataPath = path.join(__dirname, "../data/admin.json");
  const adminData = JSON.parse(fs.readFileSync(adminDataPath, "utf-8"));

  if (adminMail === adminData.adminMail && password === adminData.password) {
    const token = jwt.sign(
      { role: "admin", username: adminMail },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    // sendAdminLoginAlert(adminMail);

    res.json({ role: "SuperAdmin", message: "✅ Admin logged in", token });
  } else {
    res.status(401).json({ message: "❌ Invalid admin credentials" });
  }
};

exports.dashboard = (req, res) => {
  res.send("✅ Welcome to Admin Dashboard");
};

exports.createMember = async (req, res) => {
  const { Membername, MemberMail, MemberPassword } = req.body;

  try {
    // Validate required fields
    if (!Membername || !MemberMail || !MemberPassword) {
      return res.status(400).json({ message: "❌ Missing fields" });
    }

    // Check if the member already exists
    const existing = await Member.findOne({ MemberMail });
    if (existing) {
      return res.status(400).json({ message: "❌ Member already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(MemberPassword, 10);

    // Create new member
    const member = new Member({
      Membername,
      MemberMail,
      MemberPassword: hashedPassword,
    });

    await member.save();

    // Decode who created the member from the token
    const token = req.headers.authorization?.split(" ")[1];
    let createdBy = "unknown";

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      createdBy = decoded.username || "unknown";
    }

    console.log("📧 Sending alert >>", createdBy, MemberMail);
    // await sendAdminCreatedAlert(createdBy, MemberMail);

    res.json({
      role: "Member",
      message: "✅ Member added successfully",
      createdBy,
    });
  } catch (error) {
    console.error("❌ Error creating member:", error);
    res.status(500).json({ message: "❌ Server error" });
  }
};

exports.deleteMember = async (req, res) => {
  const { MemberMail, Membername } = req.body;

  if (!MemberMail || !Membername) {
    return res
      .status(400)
      .json({ message: "Enter valid userMail and username" });
  }

  try {
    const user = await Member.findOneAndDelete({ MemberMail, Membername });

    if (!user) {
      return res.status(404).json({ message: "❌ Member not found" });
    }

    return res.status(200).json({ message: "✅ Member deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting member:", error);
    return res.status(500).json({ message: "❌ Server error" });
  }
};

exports.createAgent = async (req, res) => {
  const { AgentMail, Agentname, AgentPassword } = req.body;

  if (!AgentMail || !Agentname || !AgentPassword) {
    return res.status(400).json({ message: "❌ Missing fields" });
  }

  try {
    const existing = await AgentModel.findOne({
      $or: [{ AgentMail }, { Agentname }],
    });

    if (existing) {
      return res.status(400).json({ message: "❌ Agent already exists" });
    }

    const hashedPassword = await bcrypt.hash(AgentPassword, 10);

    const newAgent = new AgentModel({
      AgentMail,
      Agentname,
      AgentPassword: hashedPassword,
    });

    await newAgent.save();

    res.status(201).json({ message: "✅ Agent created successfully" });
  } catch (error) {
    console.error("❌ Error creating agent:", error);
    res.status(500).json({ message: "❌ Server error" });
  }
};

exports.deleteAgents = async (req, res) => {
  const { AgentMail, Agentname } = req.body;
  try {
    const { AgentMail, Agentname } = req.body;
    const agents = await AgentModel.findOneAndDelete({ AgentMail, Agentname });
    if (!agents) return res.status(404).json({ message: "❌ Agent not found" });
    return res.status(200).json({ message: "✅ Agent deleted successfully" });
  } catch (error) {
    console.error("❌ Error getting agents:", error);
    res.status(500).json({ message: "❌ Server error" });
  }
};
