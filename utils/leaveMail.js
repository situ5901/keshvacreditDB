const express = require("express");
const router = express.Router();
const sendMail = require("./mailer");
router.post("/leaveMail", async (req, res) => {
  console.log("Incoming Body:", req.body); // 👈 check what you're receiving

  const {
    firstName,
    lastName,
    department,
    phone,
    email,
    reason,
    otherReason,
    fromDate,
    toDate,
    days,
    comments,
  } = req.body;

  try {
    await sendMail({
      firstName,
      lastName,
      department,
      phone,
      email,
      reason,
      otherReason,
      fromDate,
      toDate,
      days,
      comments,
    });

    res.status(200).send("✅ Form submitted and email sent to admin!");
  } catch (err) {
    console.error("❌ Error sending email:", err);
    res.status(500).send("Failed to send email");
  }
});
module.exports = router;
