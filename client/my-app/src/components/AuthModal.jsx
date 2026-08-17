import React, { useState, useContext, useEffect } from 'react';
import { X, Lock, Mail, User as UserIcon, LogIn, UserPlus } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import './AuthModal.css';

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const { login } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLogin(initialMode === 'login');
    setError('');
    setEmail('');
    setPassword('');
    setName('');
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin ? { email, password } : { email, password, name };

    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      login(data.token, data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <button className="auth-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="auth-header">
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{isLogin ? 'Log in to access your saved research' : 'Sign up to start saving autonomous research'}</p>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="input-group">
              <label>Full Name</label>
              <div className="input-field-wrapper">
                <UserIcon size={16} className="input-icon" />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label>Email Address</label>
            <div className="input-field-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-field-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              'Processing...'
            ) : isLogin ? (
              <>
                <LogIn size={16} /> Log In
              </>
            ) : (
              <>
                <UserPlus size={16} /> Sign Up
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          {isLogin ? (
            <p>
              Don't have an account?{' '}
              <button onClick={() => { setIsLogin(false); setError(''); }}>Sign Up</button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button onClick={() => { setIsLogin(true); setError(''); }}>Log In</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}