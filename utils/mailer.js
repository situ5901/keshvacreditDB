require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

// Function to send leave application email
const sendMail = async (formData) => {
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
  } = formData;

  const mailOptions = {
    from: `"FormBot 👨‍💻" <${process.env.EMAIL}>`,
    to: process.env.EMAIL,
    subject: "📩 New Leave Request Received",
    html: `
      <h2>New Leave Application</h2>
      <p><strong>Name:</strong> ${firstName} ${lastName}</p>
      <p><strong>Department:</strong> ${department}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p><strong>Other Reason:</strong> ${otherReason}</p>
      <p><strong>From:</strong> ${fromDate}</p>
      <p><strong>To:</strong> ${toDate}</p>
      <p><strong>Total Days:</strong> ${days}</p>
      <p><strong>Comments:</strong> ${comments}</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Function to send contact form message
const ContactMail = async (formData) => {
  const { name, email, phone, message } = formData;

  const mailOptions = {
    from: `"ContactBot 📬" <${process.env.EMAIL}>`,
    to: process.env.EMAIL,
    subject: "📩 New Contact Message Received",
    html: `
      <h2>New Contact Form Keshvacredit</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Email:</strong> ${phone}</p>
      <p><strong>Message:</strong><br/>${message}</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendMail,
  ContactMail,
};
