// src/components/StreamLogs.jsx
import React from 'react';
import './StreamLogs.css';

export default function StreamLogs({ logs, isSearching }) {
  return (
    <div className="stream-box">
      <div className="stream-header">
        <span>Agent Thought Stream</span>
        {isSearching && <div className="spinner"></div>}
      </div>
      {logs.map((log, i) => (
        <div key={i} className="log-entry">
          <span className={`badge badge-${log.type}`}>{log.type}</span>
          <span>{log.text}</span>
        </div>
      ))}
    </div>
  );
}