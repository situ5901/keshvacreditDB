const express = require("express");
const router = express.Router();
const adsmail = require("../models/adsMail");

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
    <title>KeshvaCredit – Personal Loan Offer</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #0e0e0e;
        font-family: 'Segoe UI', Arial, sans-serif;
        color: #ffffff;
      }
      .container {
        max-width: 600px;
        margin: auto;
        background: #1a1a1a;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.6);
      }
      .header {
        background: linear-gradient(135deg, #8e2de2, #4a00e0);
        padding: 35px 25px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
        color: #fff;
        line-height: 1.4;
      }
      .header p {
        font-size: 15px;
        margin-top: 10px;
        color: #e0e0e0;
      }
      .banner {
        width: 100%;
        display: block;
      }
      .content {
        padding: 25px 22px;
        font-size: 16px;
        color: #eee;
      }
      .content h2 {
        font-size: 22px;
        color: #ffd700;
        margin-bottom: 14px;
      }
      .content ul {
        padding-left: 20px;
        margin-top: 15px;
        line-height: 1.7;
      }
      .content ul li {
        margin-bottom: 10px;
      }
      .cta {
        text-align: center;
        margin: 35px 0 20px;
      }
      .cta a {
        background: linear-gradient(135deg, #ff512f, #dd2476);
        color: white;
        padding: 14px 30px;
        text-decoration: none;
        border-radius: 50px;
        font-weight: 600;
        font-size: 16px;
        box-shadow: 0 4px 10px rgba(255, 82, 82, 0.4);
        display: inline-block;
        transition: background 0.3s ease;
      }
      .cta a:hover {
        background: linear-gradient(135deg, #e60073, #ff3300);
      }
      .footer {
        font-size: 12px;
        text-align: center;
        color: #999;
        padding: 18px 20px;
        background: #121212;
      }
    </style>
  </head>
  <body>
    <div class="container">
   
      <img class="banner" src="https://i.postimg.cc/VvQjgLYM/Blue-and-White-Simple-Home-Loan-Services-Instagram-Post.png" alt="Loan Banner" />

      <div class="content">
        <h2>💸 Need Instant Cash?</h2>
        <p>
          Dear Customer,<br>
          🚀 Get your personal loan in <strong>just 5 minutes</strong>.<br>
          💰 Loan amount: <strong>Up to ₹5,00,000</strong><br>
          🔐 Safe, Secure & Fully Online!
        </p>

        <h2>✨ Why Choose KeshvaCredit?</h2>
        <ul>
          <li>⚡ Instant Approval & Quick Disbursal</li>
          <li>❌ No Processing Fees</li>
          <li>🧾 100% Paperless Application</li>
          <li>📲 No Branch Visits Required</li>
        </ul>

        <div class="cta">
          <a href="https://keshvacredit.com">🚀 Apply Now</a>
        </div>
      </div>

      <div class="footer">
        Need assistance? Just reply to this email or contact our support team.<br><br>
        © 2025 KeshvaCredit™. All rights reserved.
      </div>
    </div>
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
