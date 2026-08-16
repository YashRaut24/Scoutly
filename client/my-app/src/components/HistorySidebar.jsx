// src/components/HistorySidebar.jsx
import React from 'react';
import { Zap, Compass, Pin, Trash2, Clock } from 'lucide-react';
import './HistorySidebar.css';

export default function HistorySidebar({
  history = [],
  activeReportId,
  onSelectReport,
  onTogglePin,
  onDeleteReport
}) {
  return (
    <aside className="history-sidebar">
      <div className="sidebar-header">
        <Clock className="header-icon" />
        <h2>Research History</h2>
      </div>

      <div className="history-list">
        {history.length === 0 ? (
          <div className="empty-history">No research history yet</div>
        ) : (
          history.map((item) => {
            const isDeep = item.depth === 'deep_dive';

            return (
              <div
                key={item._id}
                className={`history-item ${activeReportId === item._id ? 'active' : ''}`}
                onClick={() => onSelectReport(item)}
              >
                <div className="history-content">
                  {/* Mode Icon */}
                  {isDeep ? (
                    <Compass className="depth-icon deep" title="Deep Dive" />
                  ) : (
                    <Zap className="depth-icon quick" title="Quick Summary" />
                  )}

                  {/* Query Text */}
                  <span className="history-query" title={item.query}>
                    {item.query}
                  </span>
                </div>

                <div className="history-actions">
                  <button
                    type="button"
                    className={`action-btn ${item.isPinned ? 'pinned' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(item._id);
                    }}
                    title={item.isPinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="action-icon" />
                  </button>

                  <button
                    type="button"
                    className="action-btn delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteReport(item._id);
                    }}
                    title="Delete"
                  >
                    <Trash2 className="action-icon" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}