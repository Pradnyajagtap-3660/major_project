import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ChatbotPanel.css";

const isRouteQuery = (text) =>
  /how do i get to|how to get to|how to reach|directions to|navigate to|take me to|route to|way to|i want to go|get me to/i.test(text);

function ChatbotPanel() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! 👋 I'm your Flood Safety Assistant.\n\nI can help you with:\n• Flood safety tips\n• Flood risk in Mumbai areas\n• Emergency contacts\n• Evacuation advice\n\nWhat would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const bottomRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Capture browser location for location-aware flood guidance
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      () => {
        setLocation(null);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const requestLocation = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setLocation(loc);
          resolve(loc);
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

  const needsLocation = (text) =>
    /nearest|closest|near me|nearby|shelter|hospital|route|direction|navigate|how (far|do i get|to get|to reach)/i.test(text);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInput("");
    setLoading(true);

    let currentLocation = location;

    if (!currentLocation && needsLocation(text)) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Requesting your location... please allow access in the browser popup." },
      ]);
      currentLocation = await requestLocation();
      if (!currentLocation) {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "Location access was denied. To enable it: click the lock icon in your browser's address bar → Site settings → Location → Allow, then try again." },
        ]);
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch("http://localhost:5001/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, location: currentLocation }),
      });
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.reply,
          routeLink: isRouteQuery(text) ? { destination: data.destination, userLocation: currentLocation } : null,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Could not connect to server. Please check your connection." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render text with line breaks and bold (*text*)
  const renderText = (text) => {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/\*([^*]+)\*/g);
      return (
        <span key={i}>
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
          )}
          {i < text.split("\n").length - 1 && <br />}
        </span>
      );
    });
  };

  const suggestions = [
    "Flood risk in Kurla",
    "What to do during flood?",
    "Emergency contacts",
    "Evacuation guide",
  ];

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <span className="chatbot-avatar">🌊</span>
        <div>
          <div className="chatbot-title">Flood Safety Assistant</div>
          <div className="chatbot-subtitle">for Mumbai flood scenarios</div >
        </div>
      </div>

      <div className="chat-window">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-bubble-row ${msg.sender}`}>
            {msg.sender === "bot" && <span className="chat-avatar">🤖</span>}
            <div className={`chat-bubble ${msg.sender}`}>
              {renderText(msg.text)}
              {msg.routeLink && (
                <button
                  className="route-link-btn"
                  onClick={() => {
                    const { destination, userLocation } = msg.routeLink;
                    if (destination && userLocation) {
                      navigate("/route", {
                        state: { userLocation, shelter: destination },
                      });
                    } else {
                      navigate("/safeRouteFinder");
                    }
                  }}
                >
                  🗺️ Open Safe Route Finder
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-bubble-row bot">
            <span className="chat-avatar">🤖</span>
            <div className="chat-bubble bot typing">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick suggestion chips */}
      <div className="chat-suggestions">
        {suggestions.map((s, i) => (
          <button key={i} className="suggestion-chip" onClick={() => {
            setInput(s);
          }}>
            {s}
          </button>
        ))}
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about flood safety, risk in an area..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default ChatbotPanel;
