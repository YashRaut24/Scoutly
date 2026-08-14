// client/src/components/HistorySidebar.jsx
import React from 'react';
import './HistorySidebar.css';

export default function HistorySidebar({ history, onSelectReport, onDeleteReport }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>🌐</span> Scoutly Workspace
      </div>
      <div className="history-title">Research History</div>
      <ul className="history-list">
        {history.length === 0 ? (
          <li className="history-item empty">No saved reports yet</li>
        ) : (
          history.map((item) => (
            <li
              key={item._id}
              className="history-item"
              onClick={() => onSelectReport(item)}
            >
              <span className="history-query-text">{item.query}</span>
              <button
                className="delete-btn"
                title="Delete from history"
                onClick={(e) => {
                  e.stopPropagation(); 
                  onDeleteReport(item._id);
                }}
              >
                ✕
              </button>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}