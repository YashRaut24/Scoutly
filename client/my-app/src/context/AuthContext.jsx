import React, { createContext, useState, useEffect } from 'react';

const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : null;
};

const setCookie = (name, value, days = 7) => {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
};

const deleteCookie = (name) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
};

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getCookie('scoutly_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      setCookie('scoutly_token', token, 7);
      setLoading(true);
      fetchUserProfile(token);
    } else {
      deleteCookie('scoutly_token');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async (authToken) => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Failed to load user session:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (authToken, userData) => {
    setToken(authToken);
    setUser(userData);
    setCookie('scoutly_token', authToken, 7);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    deleteCookie('scoutly_token');
  };

  const authFetch = (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    };
    return fetch(url, { ...options, headers });
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}