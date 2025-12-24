const express = require("express");
const router = express.Router();
const adsmail = require("../models/adsMail");
const mongoose = require("mongoose");
const deleteAccSchema = new mongoose.Schema({
  email: { type: String, required: true },
  phone: { type: String, required: true },
  requestedAt: { type: Date, default: Date.now },
});

const DeleteAcc = mongoose.model("deleteAcc", deleteAccSchema);
router.post("/delete-account", async (req, res) => {
  const { email, phone } = req.body;

  if (!email || !phone) {
    return res.status(400).json({ message: "Email and phone are required" });
  }

  try {
    // Save request to DB
    const newRequest = new DeleteAcc({ email, phone });
    await newRequest.save();

    console.log(`Delete account request saved: ${email}, phone: ${phone}`);
    res.json({ message: "Delete account request saved successfully." });
  } catch (error) {
    console.error(
      `Failed to save delete account request for ${email}. Error:`,
      error,
    );
    res.status(500).json({ message: "Failed to save delete account request." });
  }
});

router.post("/adsmail", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(401).json({ message: "email is required" });
  }

  try {
    await adsmail.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Special Digital Loan Offer Just for You — KeshvaCredit",
      html: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Exclusive Loan Offer</title>
  </head>
  <body style="margin:0; padding:0; font-family:Arial, sans-serif; background:#f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 20px 0; background: #f4f4f4;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            
            <!-- Header Image -->
            <tr>
              <td style="text-align: center; padding: 20px;">
                <img
                  src="https://keshvacredit.com/mailimage.png"
                  alt="Loan Banner"
                  style="max-width: 90%; height: auto; border-radius: 8px;"
                />
              </td>
            </tr>

            <!-- Body Content -->
            <tr>
              <td style="padding: 20px 30px;">
                <h2 style="color: #004d99; margin-top: 0; text-align: center; font-size: 24px;">💸 Need Instant Cash?</h2>
                <p style="color: #444444; font-size: 16px; line-height: 1.6;">
                  We’re offering you a personal loan with <strong>low interest rates</strong> and super-fast approvals. Let us help you meet your financial needs today!
                </p>

                <ul style="color: #444444; font-size: 16px; line-height: 1.8; padding-left: 20px;">
                  <li>✅ Up to ₹5,00,000 loan</li>
                  <li>✅ 0% processing fee</li>
                  <li>✅ 100% online & paperless</li>
                  <li>✅ Approval in minutes</li>
                </ul>

                <div style="text-align: center; margin: 30px 0;">
                  <a
                    href="https://keshvacredit.com"
                    style="background: #1976d2; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;"
                  >
                    🚀 Apply Now
                  </a>
                </div>

              <p style="color: #777; font-size: 14px; text-align: center;">
  Have questions? Just reply to this email or
  <a href="mailto:situdancer9@gmail.com" style="color: #1976d2; text-decoration: none;"><b>contact<b/></b></a>
  our support team anytime.
</p>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background: #fafafa; text-align: center; padding: 18px;">
                <p style="font-size: 12px; color: #999; margin: 0;">
                  © 2025 <strong>KeshvaCredit™</strong>. All Rights Reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`,
    });

    console.log(`Ad mail successfully sent to: ${email}`);

    res.json({ message: `Ad mail sent to ${email}` });
  } catch (error) {
    console.error(`Failed to send ad mail to ${email}. Error:`, error);
    res.status(501).json({ message: "Mail send failed" });
  }
});

module.exports = router;
