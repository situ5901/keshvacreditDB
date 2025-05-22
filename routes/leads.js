const express = require("express");
const router = express.Router();
const { checkLeadAuth } = require("./leads_helpers.js"); // Import middleware
const User = require("../models/user.model.js"); // Import User model

router.post("/injectlead", checkLeadAuth, async (req, res) => {
  const { data } = req.body;
  const partner = req.partner; // Partner Name from Middleware

  try {
    let existingUser = await User.findOne({ phone: data.phone });

    if (existingUser) {
      // Dedupe case
      existingUser.partnerHistory.push({
        name: partner,
        type: "dedupe",
      });

      await existingUser.save(); // Save dedupe entry

      return res.json({
        success: true,
        message: "Existing user updated!",
        status: "dedupe", // 👈 Response me dedupe status
        user: existingUser,
      });
    }

    // New user case
    const newUser = new User({
      ...data,
      partner: partner,
      partnerHistory: [{ name: partner, type: "new" }],
    });

    await newUser.save();

    res.json({
      success: true,
      message: "New user created!",
      status: "new", // 👈 Response me new status
      user: newUser,
    });
  } catch (error) {
    res.status(500).json({ error: "Database error!", details: error.message });
  }
});

module.exports = router;
