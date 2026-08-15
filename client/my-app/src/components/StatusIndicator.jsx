import React from 'react';
import { Loader2, Search, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import './StatusIndicator.css';

const PHASE_CONFIG = {
  initializing: { label: 'Initializing', Icon: Loader2, className: 'phase-initializing' },
  searching: { label: 'Searching Web', Icon: Search, className: 'phase-searching' },
  reading: { label: 'Reading Sources', Icon: BookOpen, className: 'phase-reading' },
  optimizing: { label: 'Optimizing Insights', Icon: Sparkles, className: 'phase-optimizing' },
  complete: { label: 'Complete', Icon: CheckCircle2, className: 'phase-complete' }
};

export default function StatusIndicator({ status }) {
  if (!status || !status.phase) return null;

  const config = PHASE_CONFIG[status.phase] || PHASE_CONFIG.initializing;
  const { Icon, className, label } = config;

  return (
    <div className={`status-indicator ${className}`}>
      <div className="status-icon-wrapper">
        <Icon className="status-icon" />
      </div>
      <div className="status-text-container">
        <span className="status-phase-title">{label}</span>
        <span className="status-message-text">{status.message}</span>
      </div>
    </div>
  );
}