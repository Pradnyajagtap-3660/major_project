import React, { useState } from "react";
import "./Auth.css";
import { useNavigate } from "react-router-dom";

export default function Login({ onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!email.trim() || !password.trim()) {
      setMsg({ type: "error", text: "Please enter email and password." });
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      console.log(data);

      if (!res.ok) {
        setMsg({ type: "error", text: data.error });
        return;
      }

      // Save JWT
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setMsg({ type: "success", text: "Login successful!" });

      setTimeout(() => navigate("/dashboard"), 800);

    } catch (err) {
      setMsg({ type: "error", text: "Server error. Try again later." });
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-dot">SafePath</div>
          <div className="auth-desc">Login</div>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-row">
            <input
              className="input"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="form-row">
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 6 }}>
            <a className="small-link" onClick={() => onSwitch && onSwitch("forgot")}>
              Forgot password?
            </a>
            <br />
            <br />
            <div>
              <button type="submit" className="btn">Login</button>
            </div>
          </div>

          <div className="link-row">
            <span>Don't have an account?</span>
            <a className="small-link" onClick={() => navigate('/signup')}>Sign up</a>
          </div>

          {msg && (
            <div className={`msg ${msg.type === "error" ? "error" : "success"}`}>
              {msg.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
