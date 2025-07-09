const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

/**
 * 🔔 Alert when admin logs in
 */
const sendAdminLoginAlert = async (adminMail) => {
  try {
    const mailOptions = {
      from: `"Admin Login Alert" <${process.env.EMAIL}>`,
      to: process.env.EMAIL,
      subject: "🚨 Admin Login Detected",
      html: `<h3>Admin Login Successful</h3>
             <p><strong>Logged In By:</strong> ${adminMail}</p>
             <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Admin login alert email sent: ${adminMail}`);
  } catch (error) {
    console.error("❌ Failed to send login alert email:", error.message);
  }
};

/**
 * 🆕 Alert when a new admin user is created
 */
const sendAdminCreatedAlert = async (createdBy, userMail, username) => {
  try {
    const mailOptions = {
      from: `"Admin User Created" <${process.env.EMAIL}>`,
      to: process.env.EMAIL,
      subject: "🆕 Created New User",
      html: `<h3>Admin User Created</h3>
             <p><strong>Created By:</strong> ${createdBy}</p>
             <p><strong>New Member Name:</strong> ${username}</p>
             <p><strong>New Member Email:</strong> ${userMail}</p>
             <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(
      "📧 Sending alert >> createdBy:",
      createdBy,
      "| userMail:",
      userMail,
    );
  } catch (error) {
    console.error("❌ Failed to send new user alert:", error.message);
  }
};

module.exports = {
  sendAdminLoginAlert,
  sendAdminCreatedAlert,
};
