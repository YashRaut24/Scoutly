// src/components/ThemeToggle.jsx
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import './ThemeToggle.css';

export default function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      className="theme-toggle-btn"
      onClick={onToggle}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="theme-icon sun" />
      ) : (
        <Moon className="theme-icon moon" />
      )}
    </button>
  );
}