// src/components/ResearchForm.jsx
import React, { useState } from 'react';
import { Zap, Compass, Search, Bot } from 'lucide-react';
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
    <form className="research-form-container" onSubmit={handleSubmit}>
      <div className="selector-row">
        <div className="depth-selector">
          <button
            type="button"
            className={`depth-option ${depth === 'quick' ? 'active' : ''}`}
            onClick={() => setDepth('quick')}
            disabled={isLoading}
          >
            <Zap className="depth-icon" />
            <span>Quick Summary</span>
          </button>

          <button
            type="button"
            className={`depth-option ${depth === 'deep_dive' ? 'active' : ''}`}
            onClick={() => setDepth('deep_dive')}
            disabled={isLoading}
          >
            <Compass className="depth-icon" />
            <span>Deep Dive</span>
          </button>

          {/* Bot Logo button right after Deep Dive */}
          <button
            type="button"
            className={`bot-icon-pill ${isBotOpen ? 'active' : ''}`}
            onClick={onToggleBot}
            title="Ask Scoutly Bot"
          >
            <Bot className="bot-btn-icon" />
          </button>
        </div>
      </div>

      <div className="input-group">
        <input
          type="text"
          className="research-input"
          placeholder="Ask Scoutly to research any topic..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" className="submit-btn" disabled={isLoading || !prompt.trim()}>
          <Search className="btn-search-icon" />
          {isLoading ? 'Researching...' : 'Start Research'}
        </button>
      </div>
    </form>
  );
}