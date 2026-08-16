import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function ReportView({ query, content, citations = {}, isPinned, onTogglePin }) {
  const sourceList = Object.values(citations);

  return (
    <div className="report-view-container">
      <div className="report-header">
        <h2>Report: {query}</h2>
      </div>

      {/* Sources / Citations Section */}
      {sourceList.length > 0 && (
        <div className="sources-container" style={{ margin: '16px 0', padding: '12px', background: '#1a1d24', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#94a3b8' }}>Sources & References ({sourceList.length})</h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {sourceList.map((src, index) => (
              <a
                key={index}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  background: '#2a2e39',
                  color: '#60a5fa',
                  fontSize: '12px',
                  textDecoration: 'none'
                }}
              >
                <ExternalLink size={12} />
                {src.title ? (src.title.length > 35 ? src.title.slice(0, 35) + '...' : src.title) : src.url}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="report-body">
        {content}
      </div>
    </div>
  );
}