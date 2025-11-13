import { useState } from "react";
import { Map, Route, BarChart2, MessageSquare, LogOut, User } from "lucide-react";
import "./dashboard.css";
import Maps from "./Maps";
import SafeShelterFinder from "./SafeShelterFinder";
import StatisticsPanel from "./StatisticsPanel";
import ChatbotPanel from "./ChatbotPanel";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("maps");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const menuItems = [
    { id: "maps", label: "Maps", icon: <Map className="w-5 h-5" /> },
    { id: "routes", label: "Safe Route Finder", icon: <Route className="w-5 h-5" /> },
    { id: "stats", label: "Statistics & Analytics", icon: <BarChart2 className="w-5 h-5" /> },
    { id: "chatbot", label: "Chatbot Panel", icon: <MessageSquare className="w-5 h-5" /> },
  ];

  const handleLogout = () => {
    alert("You have been logged out!");
    // Here you can clear auth tokens and redirect to login page
  };

  const handleEditProfile = () => {
    alert("Redirecting to Edit Profile page...");
    // Navigate to Edit Profile route if you have one
  };

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <h1>SafePath</h1>

        <nav>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={activeTab === item.id ? "active" : ""}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Profile Section */}
        <div className="profile-section">
          <div className="profile-info" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            
            <span className="username">Pradnya Jagtap</span>
          </div>

          {showProfileMenu && (
            <div className="profile-menu">
              <button onClick={handleEditProfile}>
                <User className="w-4 h-4" /> Edit Profile
              </button>
              <button onClick={handleLogout}>
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          )}
        </div>

        
      </aside>

      {/* Main Content */}
      <main className="main">
        {activeTab === "maps" && (
          <div className="card">
            <Maps />
          </div>
        )}
        {activeTab === "routes" && (
          <div className="card">
            <SafeShelterFinder />
          </div>
        )}
        {activeTab === "stats" && (
          <div className="card">
            <StatisticsPanel />
          </div>
        )}
        {activeTab === "chatbot" && (
          <div className="card">
            <ChatbotPanel />
          </div>
        )}
      </main>
    </div>
  );
}
