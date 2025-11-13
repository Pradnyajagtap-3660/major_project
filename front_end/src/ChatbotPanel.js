import React, { useState } from "react";
import "./ChatbotPanel.css";

function ChatbotPanel() {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    const newMessages = [...messages, { sender: "user", text: input }];

    // Add bot reply (dummy for now)
    newMessages.push({
      sender: "bot",
      text: "I received your message: " + input,
    });

    setMessages(newMessages);
    setInput("");
  };

  return (
    <div className="chatbot-container">
      <h2>Chatbot Assistant</h2>
      <div className="chat-window">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`chat-message ${msg.sender === "user" ? "user" : "bot"}`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}

export default ChatbotPanel;
