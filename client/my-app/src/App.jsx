import React, { useState, useEffect } from 'react';
import './App.css';
import HistorySidebar from './components/HistorySidebar';
import ResearchForm from './components/ResearchForm';
import StreamLogs from './components/StreamLogs';
import ReportView from './components/ReportView';

export default function App() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [logs, setLogs] = useState([]);
  const [report, setReport] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.warn('Express server not connected:', err.message);
    }
  };

  const handleDeleteHistory = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/history/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item._id !== id));
      }
    } catch (err) {
      console.error('Failed to delete history:', err);
    }
  };

  const handleStartResearch = async (prompt) => {
    setQuery(prompt);
    setIsSearching(true);
    setLogs([{ type: 'system', text: 'Initializing ReAct Research Agent...' }]);
    setReport('');

    try {
      const response = await fetch('http://localhost:8000/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.replace('data: ', ''));

            if (data.type === 'status') {
              setLogs((prev) => [...prev, { type: 'system', text: data.content }]);
            } else if (data.type === 'final') {
              setReport(data.content);
              await saveToHistory(prompt, data.content);
            }
          }
        }
      }
    } catch (error) {
      setLogs((prev) => [...prev, { type: 'system', text: `Error: ${error.message}` }]);
    } finally {
      setIsSearching(false);
    }
  };

  const saveToHistory = async (queryStr, reportStr) => {
    try {
      await fetch('http://localhost:5000/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryStr, report: reportStr })
      });
      fetchHistory();
    } catch (err) {
      console.error('Failed to save history:', err);
    }
  };

  return (
    <div className="app-container">
      <HistorySidebar
        history={history}
        onSelectReport={(item) => {
          setQuery(item.query);
          setReport(item.report);
          setLogs([]);
        }}
        onDeleteReport={handleDeleteHistory}
      />

      <main className="main-workspace">
        <header className="workspace-header">
          <h1 className="workspace-title">Scoutly Agent</h1>
          <p className="workspace-subtitle">Autonomous Web Research Engine</p>
        </header>

        <ResearchForm onSubmit={handleStartResearch} isLoading={isSearching} />

        {logs.length > 0 && <StreamLogs logs={logs} isSearching={isSearching} />}

        {report && <ReportView query={query} content={report} />}
      </main>
    </div>
  );
}