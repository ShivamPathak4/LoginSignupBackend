const nodemailer = require("nodemailer");
require("dotenv").config();

const sendEmail = async (email, subject, body) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Study Notion Edtech" <${process.env.MAIL_USER}>`,
      to: email,
      subject: subject,
      html: body,
    });

    return info; // Return the info object
  } catch (error) {
    console.error("Error in sendEmail:", error.message);
    throw error; // Rethrow to handle in caller
  }
};

module.exports = sendEmail;