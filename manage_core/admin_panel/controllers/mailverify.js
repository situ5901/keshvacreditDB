const nodemailer = require("nodemailer");

const sendAdminLoginAlert = async (adminMail) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // "er.situkumar@gmail.com"
        pass: process.env.EMAIL_PASS, // Gmail app password
      },
    });

    const mailOptions = {
      from: `"Admin Login Alert" <${process.env.EMAIL_USER}>`,
      to: "er.situkumar@gmail.com",
      subject: "🚨 Admin Login Detected",
      html: `<h3>Admin Login</h3>
             <p><strong>Email:</strong> ${adminMail}</p>
             <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Alert email sent to er.situkumar@gmail.com");
  } catch (error) {
    console.error("❌ Error sending alert email:", error.message);
  }
};

module.exports = sendAdminLoginAlert;
