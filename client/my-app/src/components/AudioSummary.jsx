import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Volume2, Sparkles, Loader2 } from 'lucide-react';
import './AudioSummary.css';

export default function AudioSummary({ reportText }) {
  const [mode, setMode] = useState('browser'); // 'browser' | 'ai'
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);

  useEffect(() => {
    return () => stopAudio();
  }, [mode, reportText]);

  const stopAudio = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoading(false);
  };

  // --- 1. BROWSER NATIVE TTS (Full Text) ---
  const handleNativePlay = () => {
    if (!synthRef.current) {
      alert('Web Speech API is not supported in your browser.');
      return;
    }

    if (isPaused) {
      synthRef.current.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    synthRef.current.cancel();

    // Remove markdown symbols and read full text
    const cleanText = reportText
      .replace(/[*#_`~]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
    setIsPlaying(true);
  };

  const handleNativePause = () => {
    if (synthRef.current && isPlaying) {
      synthRef.current.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  // --- 2. AI POWERED TTS (Full Text via OpenAI) ---
  const handleAIPlay = async () => {
    if (audioRef.current && isPaused) {
      audioRef.current.play();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    if (audioRef.current && audioRef.current.src && !isPaused) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/audio/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reportText, voice: 'alloy' })
      });

      if (!res.ok) throw new Error('Failed to generate audio');

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('AI Audio error:', err);
      alert('Could not generate AI Audio. Verify OPENAI_API_KEY in backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIPause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      mode === 'browser' ? handleNativePause() : handleAIPause();
    } else {
      mode === 'browser' ? handleNativePlay() : handleAIPlay();
    }
  };

  return (
    <div className="audio-summary-card">
      <div className="audio-controls-left">
        <button
          className="audio-play-btn"
          onClick={handleTogglePlay}
          disabled={isLoading || !reportText}
          title={isPlaying ? 'Pause Audio' : 'Listen to Full Audio Report'}
        >
          {isLoading ? (
            <Loader2 size={16} className="spinner" />
          ) : isPlaying ? (
            <Pause size={16} />
          ) : (
            <Play size={16} style={{ marginLeft: '2px' }} />
          )}
        </button>

        {isPlaying || isPaused ? (
          <button className="audio-stop-btn" onClick={stopAudio} title="Stop Audio">
            <Square size={14} />
          </button>
        ) : null}

        <div className="audio-info">
          <span className="audio-title">Full Audio Report</span>
          <span className="audio-status">
            {isLoading ? 'Synthesizing Full Audio...' : isPlaying ? 'Playing Report' : 'Click to listen to full report'}
          </span>
        </div>
      </div>

      <div className="audio-mode-toggle">
        <button
          className={`mode-btn ${mode === 'browser' ? 'active' : ''}`}
          onClick={() => setMode('browser')}
        >
          <Volume2 size={13} />
          Free (Browser)
        </button>
        <button
          className={`mode-btn ${mode === 'ai' ? 'active' : ''}`}
          onClick={() => setMode('ai')}
        >
          <Sparkles size={13} />
          HD Voice (AI)
        </button>
      </div>

      <audio
        ref={audioRef}
        onEnded={() => {
          setIsPlaying(false);
          setIsPaused(false);
        }}
        hidden
      />
    </div>
  );
}