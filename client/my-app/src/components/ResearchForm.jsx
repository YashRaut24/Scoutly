// src/components/ResearchForm.jsx
import React, { useState } from 'react';
import './ResearchForm.css';

export default function ResearchForm({ onSubmit, isLoading }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSubmit(input);
  };

  return (
    <form className="research-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="research-input"
        placeholder="Ask Scoutly to research any topic..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isLoading}
      />
      <button type="submit" className="submit-btn" disabled={isLoading}>
        {isLoading ? 'Researching...' : 'Start Research'}
      </button>
    </form>
  );
}