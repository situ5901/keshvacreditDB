const nodemailer = require("nodemailer");

const adsMail = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

module.exports = adsMail;
