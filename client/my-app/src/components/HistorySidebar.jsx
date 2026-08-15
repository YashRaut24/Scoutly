import React from 'react';
import { Pin, Trash2, Clock } from 'lucide-react';
import './HistorySidebar.css';

export default function HistorySidebar({ history, onSelectReport, onDeleteReport, onTogglePin }) {
  // Sort pinned items to the top
  const sortedHistory = [...history].sort((a, b) => Number(b.isPinned) - Number(a.isPinned));

  return (
    <aside className="history-sidebar">
      <div className="sidebar-header">
        <Clock className="header-icon" />
        <h2>Research History</h2>
      </div>

      <div className="history-list">
        {sortedHistory.length === 0 ? (
          <p className="empty-history">No research history yet.</p>
        ) : (
          sortedHistory.map((item) => (
            <div
              key={item._id}
              className={`history-card ${item.isPinned ? 'is-pinned' : ''}`}
              onClick={() => onSelectReport(item)}
            >
              <div className="history-card-content">
                <span className="history-query-text">{item.query}</span>
              </div>

              <div className="history-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`action-btn pin-btn ${item.isPinned ? 'active-pin' : ''}`}
                  title={item.isPinned ? "Unpin Research" : "Pin Research"}
                  onClick={() => onTogglePin(item._id)}
                >
                  <Pin className="btn-icon" />
                </button>
                <button
                  className="action-btn delete-btn"
                  title="Delete Research"
                  onClick={() => onDeleteReport(item._id)}
                >
                  <Trash2 className="btn-icon" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}