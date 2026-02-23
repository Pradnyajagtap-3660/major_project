import { useState, useEffect, useRef } from "react";
import "./ChatbotPanel.css";

function ChatbotPanel() {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! 👋 I'm your Flood Safety Assistant.\n\nI can help you with:\n• Flood safety tips\n• Flood risk in Mumbai areas\n• Emergency contacts\n• Evacuation advice\n\nWhat would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Show user message immediately
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
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
          <div className="chatbot-subtitle">Powered by real Mumbai flood data</div>
        </div>
      </div>

      <div className="chat-window">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-bubble-row ${msg.sender}`}>
            {msg.sender === "bot" && <span className="chat-avatar">🤖</span>}
            <div className={`chat-bubble ${msg.sender}`}>
              {renderText(msg.text)}
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
