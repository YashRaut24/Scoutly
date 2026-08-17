import React, { useState } from 'react';
import { Search, Zap, Compass, Bot } from 'lucide-react';
import './ResearchForm.css';

export default function ResearchForm({ onSubmit, isLoading, onToggleBot, isBotOpen }) {
  const [prompt, setPrompt] = useState('');
  const [depth, setDepth] = useState('quick');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onSubmit(prompt, depth);
  };

  return (
    <div className="research-form-container">
      <form onSubmit={handleSubmit} className="research-form">
        <div className="form-controls-bar">
          <div className="depth-selector">
            <button
              type="button"
              className={`depth-btn ${depth === 'quick' ? 'active' : ''}`}
              onClick={() => setDepth('quick')}
            >
              <Zap size={14} /> Quick Summary
            </button>
            <button
              type="button"
              className={`depth-btn ${depth === 'deep' ? 'active' : ''}`}
              onClick={() => setDepth('deep')}
            >
              <Compass size={14} /> Deep Dive
            </button>
          </div>

          <button
            type="button"
            className={`bot-toggle-btn ${isBotOpen ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleBot();
            }}
            title="Toggle Scoutly Assistant"
          >
            <Bot size={16} />
          </button>
        </div>

        <div className="input-row">
          <input
            type="text"
            className="research-input"
            placeholder="Ask Scoutly to research any topic..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="submit-btn" disabled={isLoading || !prompt.trim()}>
            <Search size={16} />
            <span>{isLoading ? 'Researching...' : 'Start Research'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}