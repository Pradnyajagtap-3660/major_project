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

  const handleSignup = async (e) => {
  e.preventDefault();

  const response = await fetch("http://localhost:5000/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  });

  const data = await response.json();

  if (!response.ok) {
    setMsg({ type: "error", text: data.error });
    return;
  }

  setMsg({ type: "success", text: data.message });
  setTimeout(() => navigate("/login"), 1000);
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
