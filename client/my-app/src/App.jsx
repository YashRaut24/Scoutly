import React, { useState, useEffect, useContext } from 'react';
import './App.css';
import { AuthContext } from './context/AuthContext';
import HistorySidebar from './components/HistorySidebar';
import ResearchForm from './components/ResearchForm';
import ReportView from './components/ReportView';
import StatusIndicator from './components/StatusIndicator';
import ThemeToggle from './components/ThemeToggle';
import ScoutlyBot from './components/ScoutlyBot';
import AuthModal from './components/AuthModal';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';

export default function App() {
  const { user, token, logout, authFetch } = useContext(AuthContext);
  const [authModalMode, setAuthModalMode] = useState('signup');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => !token);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    setIsAuthModalOpen(!token);
    if (!token) {
      setAuthModalMode('signup');
    }
  }, [token]);

  const [isBotOpen, setIsBotOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [report, setReport] = useState('');
  const [citations, setCitations] = useState({});
  const [activeReportId, setActiveReportId] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Fetch history using authenticated fetch whenever token status changes
  useEffect(() => {
    if (!token) {
      setHistory([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        const res = await authFetch('http://localhost:5000/api/history');
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
      }
    };

    fetchHistory();
  }, [token]);

  const handleDeleteHistory = async (id) => {
    try {
      const res = await authFetch(`http://localhost:5000/api/history/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item._id !== id));
        if (activeReportId === id) {
          setActiveReportId(null);
          setReport('');
          setCitations({});
        }
      }
    } catch (err) {
      console.error('Failed to delete history:', err);
    }
  };

  const handleTogglePin = async (id) => {
    try {
      const res = await authFetch(`http://localhost:5000/api/history/${id}/pin`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const updatedItem = await res.json();
        setHistory((prev) =>
          prev.map((item) => (item._id === id ? updatedItem : item))
        );
      }
    } catch (err) {
      console.error('Failed to toggle pin state:', err);
    }
  };

  const saveToHistory = async (queryText, reportText, depth = 'quick', citationMap = {}) => {
    if (!token) return null;

    try {
      const res = await authFetch('http://localhost:5000/api/history', {
        method: 'POST',
        body: JSON.stringify({
          query: queryText,
          report: reportText,
          depth: depth,
          citations: citationMap,
          isPinned: false
        })
      });

      if (!res.ok) throw new Error('Failed to save history item');

      const savedItem = await res.json();
      setHistory((prev) => [savedItem, ...prev]);
      return savedItem;
    } catch (err) {
      console.error('Error saving to history:', err);
      return null;
    }
  };

  const handleStartResearch = async (prompt, depth = 'quick') => {
    // Prompt login modal if unauthenticated user attempts research
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    setQuery(prompt);
    setIsSearching(true);
    setActiveReportId(null);
    setCitations({});
    const depthLabel = depth === 'quick' ? 'Quick Summary' : 'Deep Dive';
    setCurrentStatus({ phase: 'initializing', message: `Initializing research (${depthLabel})...` });
    setReport('');

    try {
      const response = await fetch(
        `http://localhost:8000/api/research/stream?query=${encodeURIComponent(prompt)}&depth=${encodeURIComponent(depth)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedReport = '';
      let receivedCitations = {};

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const rawJson = trimmedLine.replace('data: ', '');
            try {
              const data = JSON.parse(rawJson);

              if (data.type === 'status') {
                setCurrentStatus({ 
                  phase: data.phase || 'processing', 
                  message: data.message || data.content || 'Processing...' 
                });
              } else if (data.type === 'citations') {
                receivedCitations = data.citations || {};
                setCitations(receivedCitations);
              } else if (data.type === 'content' && (data.delta || data.content)) {
                accumulatedReport += (data.delta || data.content);
                setReport(accumulatedReport);
              } else if (data.type === 'final' || data.phase === 'complete') {
                if (data.content) accumulatedReport = data.content;
                setCurrentStatus({ phase: 'complete', message: 'Research complete.' });
              }
            } catch (err) {
              console.error('Failed to parse SSE line:', rawJson, err);
            }
          }
        }
      }

      if (accumulatedReport) {
        const saved = await saveToHistory(prompt, accumulatedReport, depth, receivedCitations);
        if (saved && saved._id) {
          setActiveReportId(saved._id);
        }
      }
    } catch (error) {
      console.error('Research error:', error);
      setCurrentStatus({ phase: 'error', message: 'An error occurred during research stream.' });
    } finally {
      setIsSearching(false);
    }
  };

  const activeItem = history.find((item) => item._id === activeReportId);
  const isCurrentPinned = activeItem ? activeItem.isPinned : false;

  return (
    <div className="app-container">
      <HistorySidebar
        history={history}
        onSelectReport={(item) => {
          setQuery(item.query);
          setReport(item.report);
          setCitations(item.citations || {});
          setActiveReportId(item._id);
          setCurrentStatus(null);
        }}
        onDeleteReport={handleDeleteHistory}
        onTogglePin={handleTogglePin}
      />

      <main className="main-workspace">
        <div className="top-bar">
          <header className="workspace-header">
            <div>
              <h1 className="workspace-title">Scoutly Agent</h1>
              <p className="workspace-subtitle">Autonomous Web Research Engine</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ThemeToggle theme={theme} onToggle={toggleTheme} />

              {user ? (
                <div className="user-profile-badge">
                  <UserIcon size={14} />
                  <span>{user.name || user.email}</span>
                  <button onClick={logout} className="logout-btn" title="Log Out">
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="login-trigger-btn"
                >
                  <LogIn size={14} /> Log In
                </button>
              )}
            </div>
          </header>
        </div>

        <ResearchForm
          onSubmit={handleStartResearch}
          isLoading={isSearching}
          onToggleBot={() => setIsBotOpen((prev) => !prev)}
          isBotOpen={isBotOpen}
        />

        <StatusIndicator status={currentStatus} />

        {report && (
          <ReportView
            query={query}
            content={report}
            citations={citations}
            isPinned={isCurrentPinned}
            onTogglePin={activeReportId ? () => handleTogglePin(activeReportId) : null}
          />
        )}
      </main>

      {/* Render ScoutlyBot as a right sidebar component */}
      {isBotOpen && (
        <ScoutlyBot
          isOpen={isBotOpen}
          onClose={() => setIsBotOpen(false)}
          reportContext={report}
        />
      )}

      {/* Render AuthModal for login/signup */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </div>
  );
}