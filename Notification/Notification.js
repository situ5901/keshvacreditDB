require("dotenv").config();
const router = require("express").Router();
const mongoose = require("mongoose");
const admin = require("firebase-admin");

const { Notify, Token } = require("./NotifySchema.js"); // 👈 Make sure path correct

// 🔹 Firebase Initialize using .env
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

// ---------- Save Token ----------
router.post("/save-token", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "❌ Token required" });
  }

  try {
    const existing = await Token.findOne({ token });
    if (!existing) {
      await Token.create({ token });
    }
    res.json({ message: "✅ Token saved successfully", token });
  } catch (error) {
    console.error("Save Token Error:", error);
    res.status(500).json({ error: "❌ Failed to save token" });
  }
});

// ---------- Send Notification ----------
router.post("/send-notification", async (req, res) => {
  const { title, message } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: "❌ Title and message required" });
  }

  try {
    // Save notification in DB
    await Notify.create({ title, message });

    // Get all device tokens
    const tokens = await Token.find();
    const fcmTokens = tokens.map((t) => t.token);

    if (fcmTokens.length === 0) {
      return res.json({ message: "⚠ No device tokens found" });
    }

    // FCM multicast message
    const fcmMessage = {
      notification: {
        title: title,
        body: message,
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default_channel", // 👈 same channel as in Flutter code
        },
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK", // 👈 required for navigation
        id: "1",
        status: "done",
      },
      tokens: fcmTokens,
    };

    // Send notification
    const response = await admin.messaging().sendEachForMulticast(fcmMessage);

    // 🔥 Remove invalid tokens
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const err = resp.error?.message || "";
        if (
          err.includes("registration token is not a valid") ||
          err.includes("registration-token-not-registered")
        ) {
          invalidTokens.push(fcmTokens[idx]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await Token.deleteMany({ token: { $in: invalidTokens } });
      console.log("🗑 Removed invalid tokens:", invalidTokens);
    }

    res.json({
      message: "✅ Notification sent & saved to DB!",
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    console.error("Firebase Error:", error);
    res.status(500).json({
      error: "❌ Failed to send notification",
      details: error.message,
    });
  }
});

// ---------- Get Notifications ----------
router.get("/get-notify", async (req, res) => {
  try {
    const notifications = await Notify.find().sort({ date: -1 });
    res.json(notifications);
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({ error: "❌ Failed to fetch notifications" });
  }
});

module.exports = router;
