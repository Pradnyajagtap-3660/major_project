import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App";
import Dashboard from "./Dashboard";
import Maps from "./Maps";
import SafeShelterFinder from "./SafeShelterFinder";
import SafeHospitalFinder from "./SafeHospitalFinder";
import SafeRouteFinder from "./SafeRouteFinder";
import SafeRouteMap from "./SafeRouteMap";
import StatisticsPanel from "./StatisticsPanel";
import ChatbotPanel from "./ChatbotPanel";
import Login from "./Login";  
import Signup from "./Signup";
import ForgotPassword from "./ForgotPassword";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        {/* Home Page */}
        <Route path="/" element={<App />} />

        {/* Dashboard Main */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Dashboard Sub Routes */}
         <Route path="/maps" element={<Maps/>} />
         <Route path="/safeshelterfinder" element={<SafeShelterFinder/>} />
         <Route path="/safehospitalfinder" element={<SafeHospitalFinder/>} />
         <Route path="/safeRouteFinder" element={<SafeRouteFinder/>} />
          <Route path="/route" element={<SafeRouteMap />} />
         <Route path="/statistics" element={<StatisticsPanel/>} />
          <Route path="/chatbotpanel" element={<ChatbotPanel/>} />


        {/*<Route path="/dashboard/routes" element={<div>🚦 Safe Route Finder Page</div>} />
        <Route path="/dashboard/stats" element={<div>📊 Statistics & Analytics Page</div>} />
        <Route path="/dashboard/chatbot" element={<div>💬 Chatbot Panel Page</div>} /> */}
      </Routes>
    </Router>
  </React.StrictMode>
);

