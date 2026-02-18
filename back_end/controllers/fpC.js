const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const pool = require("../db"); 
const nodemailer = require("nodemailer");

/* --------------------------------------------------------
   Nodemailer Transport (Use Gmail App Password)
-------------------------------------------------------- */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "pradnyajagtap3660@gmail.com",          // Your Gmail
    pass: "ssws nuhz peha ocyn",            // App password
  },
});

// Generate 6-digit OTP
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* --------------------------------------------------------
   1️⃣ REQUEST RESET CODE (Send OTP Email)
-------------------------------------------------------- */
exports.requestReset = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    const userQuery = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userQuery.rowCount === 0)
      return res.status(404).json({ error: "Email not found" });

    const code = generateCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await pool.query(
      "UPDATE users SET reset_code=$1, reset_expiry=$2 WHERE email=$3",
      [code, expiry, email]
    );

    /* -----------------------
        SEND EMAIL OTP
    ------------------------ */
    await transporter.sendMail({
      from: "pradnyajagtap3660@gmail.com",
      to: email,
      subject: "Your Password Reset Code",
      html: `
        <h2>Your Verification Code</h2>
        <p>Use the code below to reset your password:</p>
        <h1 style="letter-spacing:3px;">${code}</h1>
        <p>This code will expire in <b>10 minutes</b>.</p>
      `
    });

    res.json({
      message: "Verification code sent to email",
    });

  } catch (err) {
    console.error("Email error → ", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* --------------------------------------------------------
   2️⃣ VERIFY CODE & RESET PASSWORD
-------------------------------------------------------- */
exports.verify = async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword)
    return res.status(400).json({ error: "All fields required" });

  try {
    const user = await pool.query(
      "SELECT reset_code, reset_expiry FROM users WHERE email=$1",
      [email]
    );

    if (user.rowCount === 0)
      return res.status(404).json({ error: "User not found" });

    const { reset_code, reset_expiry } = user.rows[0];

    if (!reset_code || !reset_expiry)
      return res.status(400).json({ error: "No reset request found" });

    if (reset_code !== code)
      return res.status(400).json({ error: "Invalid verification code" });

    if (new Date() > new Date(reset_expiry))
      return res.status(400).json({ error: "Verification code expired" });

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password=$1, reset_code=NULL, reset_expiry=NULL WHERE email=$2",
      [hashed, email]
    );

    res.json({ message: "Password reset successful!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
