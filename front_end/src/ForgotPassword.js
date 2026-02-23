import React, { useState } from "react";
import "./Auth.css";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();

  /* --------------------------------------------------------
      1️⃣ SEND RESET CODE
  -------------------------------------------------------- */
  const handleRequest = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!email.trim()) {
      setMsg({ type: "error", text: "Please enter your registered email." });
      return;
    }

    try {
      const res = await fetch("http://localhost:5001/api/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      console.log(data);

      if (!res.ok) {
        setMsg({ type: "error", text: data.error });
        return;
      }

      setStep(2);
      setMsg({
        type: "success",
        text: "Verification code sent to your email!"
      });

    } catch (err) {
      setMsg({ type: "error", text: "Server error. Try again later." });
    }
  };

  /* --------------------------------------------------------
      2️⃣ VERIFY CODE & RESET PASSWORD
  -------------------------------------------------------- */
  const handleReset = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!code.trim() || !newPassword.trim()) {
      setMsg({ type: "error", text: "Please enter all fields." });
      return;
    }

    if (newPassword.length < 6) {
      setMsg({
        type: "error",
        text: "Password must be at least 6 characters."
      });
      return;
    }

    try {
      const res = await fetch("http://localhost:5001/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword })
      });

      const data = await res.json();
      console.log(data);

      if (!res.ok) {
        setMsg({ type: "error", text: data.error });
        return;
      }

      setMsg({
        type: "success",
        text: "Password reset successful! Redirecting..."
      });

      setTimeout(() => navigate("/login"), 1200);

    } catch (err) {
      setMsg({ type: "error", text: "Server error. Try again later." });
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-dot">SafePath</div>
          <div>
            <div className="auth-title">Forgot Password</div>
            <div className="auth-desc">Reset your password securely.</div>
          </div>
        </div>

        {/* Step 1 : Request Email OTP */}
        {step === 1 && (
          <form onSubmit={handleRequest}>
            <div className="form-row">
              <input
                className="input"
                placeholder="Enter registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button className="btn" style={{ marginTop: 10 }}>
              Send Verification Code
            </button>

            <div className="link-row" style={{ marginTop: 12 }}>
              <span>Remembered?</span>
              <a className="small-link" onClick={() => navigate("/login")}>
                Back to login
              </a>
            </div>

            {msg && (
              <div className={`msg ${msg.type}`}>
                {msg.text}
              </div>
            )}
          </form>
        )}

        {/* Step 2 : Enter OTP + New Password */}
        {step === 2 && (
          <form onSubmit={handleReset}>
            <div className="form-row">
              <input
                className="input"
                placeholder="Enter verification code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div className="form-row">
              <input
                className="input"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <button className="btn" style={{ marginTop: 10 }}>
              Reset Password
            </button>

            <div className="link-row" style={{ marginTop: 12 }}>
              <span>Need help?</span>
              <a className="small-link" onClick={() => navigate("/login")}>
                Back to login
              </a>
            </div>

            {msg && (
              <div className={`msg ${msg.type}`}>
                {msg.text}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
