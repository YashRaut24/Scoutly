import React from 'react';
import { Pin, Download, FileText } from 'lucide-react';
import './ReportView.css';

export default function ReportView({ query, content, isPinned, onTogglePin }) {
  return (
    <div className={`report-view-container ${isPinned ? 'pinned-dock' : ''}`}>
      <div className="report-header">
        <div className="report-title-group">
          <h2>Report: {query}</h2>
          {isPinned && <span className="pinned-badge">Pinned</span>}
        </div>

        <div className="report-actions">
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`report-btn pin-action-btn ${isPinned ? 'is-active' : ''}`}
            >
              <Pin className="btn-icon" />
              {isPinned ? 'Unpin Report' : 'Pin Report'}
            </button>
          )}

          <button className="report-btn">
            <Download className="btn-icon" />
            Markdown
          </button>
          <button className="report-btn">
            <FileText className="btn-icon" />
            Export PDF
          </button>
        </div>
      </div>

      <div className="report-content">
        {content}
      </div>
    </div>
  );
}