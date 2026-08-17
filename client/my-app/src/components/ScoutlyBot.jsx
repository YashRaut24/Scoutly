import { useState, useRef, useEffect, useContext } from 'react';
import { Bot, X, Send, ExternalLink, Loader2, History, Plus, Trash2, MessageSquare } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import './ScoutlyBot.css';

const DEFAULT_WELCOME = {
  sender: 'bot',
  text: 'Hello! I am Scoutly Bot. Ask me anything about the generated research report or request live updates on topics mentioned in it.'
};

// API Ports: FastAPI AI Service (8000) vs Node Backend (5000)
const AI_API_URL = 'http://localhost:8000';
const BACKEND_API_URL = 'http://localhost:5000';

const toSessionSummary = (session) => {
  const messages = session.messages || [];
  const lastMessage = messages[messages.length - 1];

  return {
    _id: session._id,
    reportId: session.reportId,
    title: session.title,
    updatedAt: session.updatedAt,
    createdAt: session.createdAt,
    messageCount: messages.length,
    lastMessage: lastMessage?.text || ''
  };
};

export default function ScoutlyBot({
  isOpen,
  onClose,
  reportContext,
  reportId = null
}) {
  const [messages, setMessages] = useState([DEFAULT_WELCOME]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyReportId, setHistoryReportId] = useState(reportId);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const messagesEndRef = useRef(null);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    if (isOpen && !showHistory) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen, showHistory]);

  // Fetch history drawer items when opened
  useEffect(() => {
    if (!showHistory || !token || !reportId) {
      return;
    }

    let ignore = false;

    const fetchHistoryList = async () => {
      try {
        const params = new URLSearchParams({ reportId });
        const res = await fetch(`${BACKEND_API_URL}/api/bot/history?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok && !ignore) {
          const data = await res.json();
          setHistoryReportId(reportId);
          setHistoryList(data);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load bot history:', err);
        }
      }
    };

    fetchHistoryList();

    return () => {
      ignore = true;
    };
  }, [showHistory, token, reportId]);

  const loadSession = async (sessionId) => {
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/bot/history/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const session = await res.json();
        const savedMessages = session.messages || [];
        setMessages(savedMessages.length > 0 ? savedMessages : [DEFAULT_WELCOME]);
        setActiveSessionId(session._id);
        setShowHistory(false);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([DEFAULT_WELCOME]);
    setShowHistory(false);
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/bot/history/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setHistoryList((prev) => prev.filter((s) => s._id !== sessionId));
        if (activeSessionId === sessionId) {
          startNewChat();
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const visibleHistoryList = reportId && historyReportId === reportId ? historyList : [];

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    const userQuery = input.trim();
    if (!userQuery || isLoading) return;

    if (!reportId) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Open or generate a research report first, then Scoutly Bot can save the chat for that report.',
          isError: true
        }
      ]);
      return;
    }

    if (!token) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Log in first so Scoutly Bot can save this chat to your history.',
          isError: true
        }
      ]);
      return;
    }

    const userMsg = { sender: 'user', text: userQuery };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Send query to Python AI service
      const res = await fetch(`${AI_API_URL}/api/assistant/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportContext: reportContext || 'No report context available.',
          userQuery: userQuery
        })
      });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);

      const data = await res.json();
      const botMsg = {
        sender: 'bot',
        text: data.answer,
        citationMap: data.citationMap || {}
      };

      setMessages((prev) => [...prev, botMsg]);

      // Save interaction to Node backend database
      if (token) {
        const saveRes = await fetch(`${BACKEND_API_URL}/api/bot/history/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            reportId,
            sessionId: activeSessionId,
            title: userQuery,
            userMessage: userMsg,
            botMessage: botMsg
          })
        });

        if (saveRes.ok) {
          const savedSession = await saveRes.json();
          const summary = toSessionSummary(savedSession);

          setActiveSessionId(savedSession._id);
          setHistoryReportId(reportId);
          setHistoryList((prev) => {
            const exists = prev.some((item) => item._id === savedSession._id);

            if (exists) {
              return prev.map((item) =>
                item._id === savedSession._id ? summary : item
              );
            }

            return [summary, ...prev];
          });
        }
      }
    } catch (err) {
      console.error('Error querying Scoutly Bot:', err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'An error occurred while processing your request. Please check that backend servers are running.',
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
        </div>

        <div className="bot-header-actions">
          <button
            type="button"
            className={`bot-action-btn ${showHistory ? 'active' : ''}`}
            onClick={() => setShowHistory((prev) => !prev)}
            title="Chat History"
          >
            <History size={16} />
          </button>
          <button
            type="button"
            className="bot-action-btn"
            onClick={startNewChat}
            title="New Chat"
          >
            <Plus size={16} />
          </button>
          <button type="button" className="bot-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* History Drawer View */}
      {showHistory ? (
        <div className="bot-history-container">
          <div className="history-header">
            <h4>Report Chat History</h4>
          </div>
          {visibleHistoryList.length === 0 ? (
            <div className="empty-history">No previous chat history found.</div>
          ) : (
            <div className="history-list">
              {visibleHistoryList.map((session) => (
                <div
                  key={session._id}
                  className={`history-card ${activeSessionId === session._id ? 'active' : ''}`}
                  onClick={() => loadSession(session._id)}
                >
                  <MessageSquare size={14} className="history-icon" />
                  <div className="history-info">
                    <span className="history-title">{session.title || 'Chat Session'}</span>
                    <span className="history-date">
                      {new Date(session.updatedAt || session.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    className="delete-history-btn"
                    onClick={(e) => deleteSession(e, session._id)}
                    title="Delete Chat"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Message Chat Body */
        <div className="bot-messages-container">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-row ${msg.sender}`}>
              <div className={`chat-bubble ${msg.sender} ${msg.isError ? 'error' : ''}`}>
                <div className="bubble-content">{msg.text}</div>

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
      )}

      {/* Input Form Footer */}
      {!showHistory && (
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
      )}
    </aside>
  );
}
