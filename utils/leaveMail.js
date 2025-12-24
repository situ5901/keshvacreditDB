const express = require("express");
const router = express.Router();
const { sendMail, ContactMail } = require("./mailer"); // Import both functions

router.post("/leaveMail", async (req, res) => {
  console.log("Incoming Body:", req.body);

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

router.post("/contactMail", async (req, res) => {
  const { name, email, phone, message } = req.body; // fixed typo here

  try {
    await ContactMail({ name, email, phone, message });
    res.status(200).send("Thank you! We will contact you shortly");
  } catch (err) {
    console.error(" Error sending email:", err);
    res.status(400).send("Error sending email");
  }
});

module.exports = router;
