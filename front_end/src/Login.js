import React, { useState } from "react";
import "./Auth.css";
import Signup from "./Signup";
import { useNavigate } from "react-router-dom";

function getUsers() {
  return JSON.parse(localStorage.getItem("mock_users") || "[]");
}

export default function Login({ onSwitch, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setMsg(null);

    if (!email.trim() || !password) {
      setMsg({ type: "error", text: "Please provide email and password." });
      return;
    }
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      setMsg({ type: "error", text: "Invalid credentials. Please try again." });
      return;
    }

    // Mock login: save current user
    localStorage.setItem("mock_current_user", JSON.stringify({ id: user.id, name: user.name, email: user.email }));
    setMsg({ type: "success", text: `Welcome back, ${user.name}!` });

    if (onLogin) onLogin(user);

    // optionally redirect by switching tab
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-dot">SafePath</div>
          
          <div>
            
            
            <div className="auth-desc">Login </div>
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-row">
            <input className="input" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-row">
            <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <div style={{ marginTop: 6 }}>
            <a className="small-link" onClick={() => onSwitch && onSwitch("forgot")}>Forgot password?</a>
            <br/>
            <div style={{ width: "100%" }}>
                <br/>
              <button type="submit" className="btn">Login</button>
            </div>
          </div>

          <div className="link-row">
            <span>Don't have an account?</span>
            <a className="small-link" onClick={() => navigate('/signup')}>Sign up</a>
          </div>

          {msg && <div className={`msg ${msg.type === "error" ? "error" : "success"}`}>{msg.text}</div>}
        </form>
      </div>
    </div>
  );
}
