const express = require("express");
const router = express.Router();
const adsmail = require("../models/adsMail");

router.post("/adsmail", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "email is required" });
  }

  try {
    await adsmail.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Special Ad from Situcome",
      html: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Exclusive Loan Offer</title>
  </head>
  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
                 <tr>
                  <td align="center" style="background:#004d99; color:#ffffff; padding: 30px; font-family: Arial, sans-serif;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: bold;">KeshvaCredit Loan Offers</h1>
                  <p style="margin: 8px 0 0 0; font-size: 16px; font-style: italic;">Empowering Your Financial Future</p>
                     </td>
                    </tr>
            <tr>
              <td style="padding:20px;">
                <img
                  src="https://d1csarkz8obe9u.cloudfront.net/posterpreviews/personal-loan-banner-ad-design-template-036280f01a5e27157b98684350431119_screen.jpg?ts=1733257279"
                  alt="Loan Banner"
                  style="max-width:100%;border-radius:4px;"
                />
                <h2 style="color:#1976d2;margin-top:20px;">Need Instant Cash?</h2>
                <p style="color:#555;font-size:16px;">
                  We are offering you a personal loan with <strong>low interest rates</strong> and fast approvals.
                </p>
                <ul style="color:#555;font-size:16px;line-height:1.6;">
                  <li>✅ Up to ₹5,00,000 loan</li>
                  <li>✅ 0% processing fee</li>
                  <li>✅ 100% online & paperless</li>
                  <li>✅ Approval in minutes</li>
                </ul>
                <div style="text-align:center;margin:20px;">
                  <a
                    href="https://keshvacredit.com"
                    style="background:#1976d2;color:#fff;text-decoration:none;padding:12px 24px;border-radius:4px;display:inline-block;"
                  >Apply Now</a>
                </div>
                <p style="color:#555;font-size:14px;">
                  If you have any questions, reply to this email or call our support team anytime.
                </p>
                <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
                <p style="font-size:12px;color:#999;text-align:center;">
                 © 2025 Keshvacredit™. All Rights Reserved.
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
    res.status(500).json({ message: "Mail send failed" });
  }
});

module.exports = router;
