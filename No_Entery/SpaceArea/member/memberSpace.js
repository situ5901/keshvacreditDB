const mongoose = require("mongoose");
const Member = require("../models/member_models");

exports.healthCheck = async (req, res) => {
  const { name, memberId, memberPass } = req.body;

  if (!name || !memberId || !memberPass) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const newUser = new Member({
      name,
      userID: memberId,
      userPassword: memberPass,
    });

    await newUser.save();
    return res.status(200).json({ message: "Member created successfully" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "User ID already exists" });
    }
    res.status(500).json({ message: "Server error", error });
  }
};
