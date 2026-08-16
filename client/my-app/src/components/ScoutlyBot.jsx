import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, X, Send, Loader2, Sparkles } from 'lucide-react';
import './ScoutlyBot.css';

export default function ScoutlyBot({ isOpen, onClose, reportContext }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userQuery }]);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/assistant/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportContext: reportContext || '',
          userQuery: userQuery,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [...prev, { role: 'bot', content: data.answer }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'bot', content: `Error: ${data.detail || 'Failed to generate response.'}` },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: 'Network error. Make sure Python server (port 8000) is running.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="scoutly-bot-panel">
      <div className="bot-header">
        <div className="bot-header-title">
          <Bot className="bot-header-icon" />
          <h3>Scoutly Bot</h3>
          <span className="bot-badge">Groq / Llama 3.3</span>
        </div>
        <button type="button" className="close-btn" onClick={onClose} title="Close Assistant">
          <X className="close-icon" />
        </button>
      </div>

      <div className="bot-messages">
        {messages.length === 0 ? (
          <div className="bot-placeholder">
            <Sparkles className="placeholder-icon" />
            <p>Ask me anything about the active report context.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`bot-message-bubble ${msg.role}`}>
              <div className="message-content">
                {msg.role === 'bot' ? (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="bot-message-bubble bot loading">
            <Loader2 className="spin-icon" />
            <span>Thinking...</span>
          </div>
        )}

        {/* Scroll Anchor */}
        <div ref={messagesEndRef} />
      </div>

      <form className="bot-input-form" onSubmit={handleSend}>
        <input
          type="text"
          className="bot-input"
          placeholder="Ask a question about this report..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="bot-send-btn" disabled={loading || !input.trim()}>
          <Send className="send-icon" />
        </button>
      </form>
    </aside>
  );
}