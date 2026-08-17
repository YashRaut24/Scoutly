import React, { useState } from 'react';
import { ExternalLink, Share2, Check, Lock, Globe } from 'lucide-react';
import AudioSummary from './AudioSummary';
import './ReportView.css';

export default function ReportView({ query, content, citations = {}, isPinned, onTogglePin, activeReportId, authFetch }) {
  const sourceList = Object.values(citations);
  const [isPublic, setIsPublic] = useState(false);
  const [shareToken, setShareToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loadingShare, setLoadingShare] = useState(false);

  const handleToggleShare = async () => {
    if (!activeReportId || !authFetch) return;
    setLoadingShare(true);

    try {
      const res = await authFetch(`http://localhost:5000/api/history/${activeReportId}/share`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const data = await res.json();
        setIsPublic(data.isPublic);
        setShareToken(data.shareToken);

        if (data.isPublic) {
          const publicUrl = `${window.location.origin}/share/${data.shareToken}`;
          navigator.clipboard.writeText(publicUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        }
      }
    } catch (err) {
      console.error('Failed to toggle public link:', err);
    } finally {
      setLoadingShare(false);
    }
  };

  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken}` : '';

  return (
    <div className="report-view-container">
      <div className="report-header">
        <h2>Report: {query}</h2>
        {activeReportId && (
          <div className="report-actions">
            <button
              type="button"
              onClick={handleToggleShare}
              disabled={loadingShare}
              className={`public-share-btn ${isPublic ? 'is-public' : ''}`}
            >
              {isPublic ? <Globe size={14} /> : <Lock size={14} />}
              {loadingShare ? 'Updating...' : isPublic ? 'Public (Link Copied)' : 'Make Public'}
            </button>
          </div>
        )}
      </div>

      {isPublic && shareUrl && (
        <div className="public-share-panel">
          <span className="public-share-link-text">Public URL: {shareUrl}</span>
          <button
            type="button"
            className="copy-share-btn"
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check size={12} /> : <Share2 size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}

      <AudioSummary reportText={content} />

      {sourceList.length > 0 && (
        <div className="sources-container">
          <h4>Sources & References ({sourceList.length})</h4>
          <div className="source-list">
            {sourceList.map((src, index) => (
              <a
                key={index}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="source-chip"
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