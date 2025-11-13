import React, { useState } from "react";
import "./Auth.css";
import Login from "./Login";
import { useNavigate } from "react-router-dom";



function getUsers() {
  return JSON.parse(localStorage.getItem("mock_users") || "[]");
}

function saveUsers(users) {
  localStorage.setItem("mock_users", JSON.stringify(users));
}

export default function Signup({ onSwitch }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();

  const validateEmail = (e) => /\S+@\S+\.\S+/.test(e);

  const handleSignup = (e) => {
    e.preventDefault();
    setMsg(null);

    if (!name.trim() || !email.trim() || !password) {
      setMsg({ type: "error", text: "Please fill all required fields." });
      return;
    }
    if (!validateEmail(email)) {
      setMsg({ type: "error", text: "Enter a valid email address." });
      return;
    }
    if (password.length < 6) {
      setMsg({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    if (password !== confirm) {
      setMsg({ type: "error", text: "Passwords do not match." });
      return;
    }

    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      setMsg({ type: "error", text: "Email already registered. Try logging in." });
      return;
    }

    users.push({ id: Date.now(), name, email: email.toLowerCase(), password });
    saveUsers(users);

    setMsg({ type: "success", text: "Signup successful! You can now log in." });
    // Optionally auto-switch to login after short delay
    setTimeout(() => {
      if (onSwitch) onSwitch("login");
    }, 1000);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-dot">SafePath</div>
          <div>
            <div className="auth-title">Create an account</div>
            
          </div>
        </div>

        <form onSubmit={handleSignup}>
          <div className="form-row">
            <input className="input" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-row">
            <input className="input" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="inline-row">
            <div style={{ flex: 1 }}>
              <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <input className="input" type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <button type="submit" className="btn">Sign Up</button>
          </div>

          <div className="link-row">
            <span>Already have an account?</span>
            <a className="small-link" onClick={() => navigate('/login')}>Login</a>
          </div>

          {msg && <div className={`msg ${msg.type === "error" ? "error" : "success"}`}>{msg.text}</div>}
        </form>
      </div>
    </div>
  );
}
