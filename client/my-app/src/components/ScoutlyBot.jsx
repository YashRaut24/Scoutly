import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, ExternalLink, Loader2 } from 'lucide-react';
import './ScoutlyBot.css';

export default function ScoutlyBot({ isOpen, onClose, reportContext }) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am Scoutly Bot. Ask me anything about the generated research report or request live updates on topics mentioned in it.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    const userQuery = input.trim();
    if (!userQuery || isLoading) return;

    setMessages((prev) => [...prev, { sender: 'user', text: userQuery }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/assistant/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportContext: reportContext || 'No report context available.',
          userQuery: userQuery
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: data.answer,
          citationMap: data.citationMap || {}
        }
      ]);
    } catch (err) {
      console.error('Error querying Scoutly Bot:', err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: '⚠️ An error occurred while processing your request. Please check that the backend server is running.',
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="scoutly-bot-sidebar">
      {/* Header */}
      <div className="bot-header">
        <div className="bot-header-left">
          <Bot className="bot-icon" size={18} />
          <span className="bot-title">Scoutly Bot</span>
          <span className="bot-badge">Groq / Llama 3.3</span>
        </div>
        <button type="button" className="bot-close-btn" onClick={onClose} title="Close">
          <X size={18} />
        </button>
      </div>

      {/* Message Chat Body */}
      <div className="bot-messages-container">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-row ${msg.sender}`}>
            <div className={`chat-bubble ${msg.sender} ${msg.isError ? 'error' : ''}`}>
              <div className="bubble-content">{msg.text}</div>

              {/* Citations section if present */}
              {msg.citationMap && Object.keys(msg.citationMap).length > 0 && (
                <div className="bot-citations-box">
                  <div className="citations-header">Sources Consulted:</div>
                  <div className="citations-list">
                    {Object.values(msg.citationMap).map((cite, i) => (
                      <a
                        key={i}
                        href={cite.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="citation-link"
                      >
                        <ExternalLink size={11} />
                        <span>{cite.title || cite.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Thinking Pill Badge */}
        {isLoading && (
          <div className="message-row bot">
            <div className="thinking-pill">
              <Loader2 className="spinner" size={14} />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Footer */}
      <form className="bot-input-form" onSubmit={handleSend}>
        <input
          type="text"
          className="bot-input-field"
          placeholder="Ask a question about this report..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bot-send-btn"
          disabled={isLoading || !input.trim()}
        >
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}