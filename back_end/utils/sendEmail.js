const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "yourgmail@gmail.com",
    pass: "your_app_password"   // NOT Gmail password — use App Password
  }
});

module.exports.sendOTP = async (toEmail, otp) => {
  const mailOptions = {
    from: "SafePath <yourgmail@gmail.com>",
    to: toEmail,
    subject: "Your SafePath Password Reset Code",
    text: `Your OTP code is ${otp}. It is valid for 10 minutes.`,
  };

  await transporter.sendMail(mailOptions);
};
