const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

async function userOfferMail(userMail, userName, offerDetails) {
  try {
    const {
      loanAmount,
      loanEmi,
      loanTenure,
      rateOfInterest,
      applyLink,
    } = offerDetails;

    const safeEmi = Number.isFinite(loanEmi) ? loanEmi.toFixed(2) : loanEmi ?? "—";

    const mailOptions = {
      from: `"KeshvaCredit" <${process.env.EMAIL}>`,
      to: userMail,
      subject: "🎉 Loan Offer Just for You!",
      html: `
<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
  <h2 style="color: #4CAF50;">Dear ${userName || "Customer"},</h2>
  <p>We are excited to present a special loan offer curated just for you! 🎁</p>

  <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
    <tr style="background-color: #f2f2f2;">
      <th style="padding: 10px; border: 1px solid #ddd;">Loan Amount</th>
      <td style="padding: 10px; border: 1px solid #ddd;">₹${loanAmount}</td>
    </tr>
    <tr>
      <th style="padding: 10px; border: 1px solid #ddd;">EMI</th>
      <td style="padding: 10px; border: 1px solid #ddd;">₹${safeEmi}</td>
    </tr>
    <tr>
      <th style="padding: 10px; border: 1px solid #ddd;">Tenure</th>
      <td style="padding: 10px; border: 1px solid #ddd;">${loanTenure} months</td>
    </tr>
    <tr style="background-color: #f2f2f2;">
      <th style="padding: 10px; border: 1px solid #ddd;">Rate of Interest</th>
      <td style="padding: 10px; border: 1px solid #ddd;">${rateOfInterest}%</td>
    </tr>
  </table>

  <p style="margin-top: 20px;">Click the button below to apply now:</p>
  <a href="${applyLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Apply Now</a>

  <p style="margin-top: 30px; font-size: 12px; color: #555;">If you have any questions, feel free to reply to this email or contact our support team.</p>

  <p style="margin-top: 10px;">Best Regards,<br><strong>KeshvaCredit Team</strong></p>
</div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Loan offer sent to ${userMail}`);
  } catch (error) {
    console.error("❌ Failed to send loan offer email:", error.message);
  }
}

module.exports = { userOfferMail };
