import React, { useState } from "react";
import "./Auth.css";

function getUsers() {
  return JSON.parse(localStorage.getItem("mock_users") || "[]");
}
function saveUsers(users) {
  localStorage.setItem("mock_users", JSON.stringify(users));
}

export default function ForgotPassword({ onSwitch }) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1); // 1: request, 2: reset
  const [code, setCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState(null);

  const handleRequest = (e) => {
    e.preventDefault();
    setMsg(null);
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      setMsg({ type: "error", text: "Email not found." });
      return;
    }
    // mock sending code
    const c = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(c);
    setStep(2);
    setMsg({ type: "success", text: `Mock code generated: ${c} (in real app you'd email this)` });
  };

  const handleReset = (e) => {
    e.preventDefault();
    setMsg(null);
    if (code !== generatedCode) {
      setMsg({ type: "error", text: "Invalid verification code." });
      return;
    }
    if (newPassword.length < 6) {
      setMsg({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    const users = getUsers();
    const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (idx === -1) {
      setMsg({ type: "error", text: "User not found." });
      return;
    }
    users[idx].password = newPassword;
    saveUsers(users);
    setMsg({ type: "success", text: "Password reset successful! You can now login." });
    setTimeout(() => onSwitch && onSwitch("login"), 1000);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-dot">SP</div>
          <div>
            <div className="auth-title">Forgot password</div>
            <div className="auth-desc">Enter your registered email to reset password.</div>
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleRequest}>
            <div className="form-row">
              <input className="input" placeholder="Registered email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div style={{ marginTop: 10 }}>
              <button className="btn">Send verification code</button>
            </div>
            <div className="link-row" style={{ marginTop: 12 }}>
              <span>Remembered?</span>
              <a className="small-link" onClick={() => onSwitch && onSwitch("login")}>Back to login</a>
            </div>
            {msg && <div className={`msg ${msg.type === "error" ? "error" : "success"}`}>{msg.text}</div>}
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleReset}>
            <div className="form-row">
              <input className="input" placeholder="Enter verification code" value={code} onChange={e => setCode(e.target.value)} />
            </div>
            <div className="form-row">
              <input className="input" type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div style={{ marginTop: 10 }}>
              <button className="btn">Reset password</button>
            </div>
            <div className="link-row" style={{ marginTop: 12 }}>
              <span>Need help?</span>
              <a className="small-link" onClick={() => onSwitch && onSwitch("login")}>Back to login</a>
            </div>
            {msg && <div className={`msg ${msg.type === "error" ? "error" : "success"}`}>{msg.text}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
