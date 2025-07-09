const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const bcrypt = require("bcrypt");
const Member = require("../../models/Member");
const sendAdminLoginAlert = reqire("./mailverify")

exports.login = (req, res) => {
  const { adminMail, password } = req.body;

  const adminDataPath = path.join(__dirname, "../data/admin.json");
  const adminData = JSON.parse(fs.readFileSync(adminDataPath, "utf-8"));

  if (username === adminData.username && password === adminData.password) {
    const token = jwt.sign(
      { role: "admin", username },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
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
  const { userId, password } = req.body;

  try {
    const existing = await Member.findOne({ userId });
    if (existing) {
      return res.status(400).json({ message: "❌ Member already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10); // 🔐 hash password

    const member = new Member({ userId, password: hashedPassword });
    await member.save();

    res.json({ message: "✅ Member created securely" });
  } catch (error) {
    console.error("❌ Error creating member:", error);
    res.status(500).json({ message: "❌ Server error" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await Member.find();
    res.json(users);
  } catch (error) {
    console.error("❌ Error getting users:", error);
    res.status(500).json({ message: "❌ Server error" });
  }
};


exports.deleteUser = async (req,res) =>{
    const {userId} = req.body;
    try {
	const user = await Member.findOneAndDelete({userId})
        res.json({message:"✅ User deleted successfully",user})
	if(!user){
	    return res.status(404).json({message:"❌ User not found"}) 
	}
    } catch (error) {
	console.error("❌ Error deleting user:",error)
	res.status(500).json({message:"❌ Server error"})		
	}
    }
}
