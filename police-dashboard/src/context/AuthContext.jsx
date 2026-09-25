import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [touristProfile, setTouristProfile] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('visionx_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function verifyExistingSession() {
      const storedToken = localStorage.getItem('visionx_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        if (res.success) {
          setUser(res.data.user);
          setTouristProfile(res.data.touristProfile);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Session verification failed, clearing token:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    }
    verifyExistingSession();
  }, []);

  async function login(email, password) {
    setError(null);
    try {
      const res = await api.login(email, password);
      if (res.success) {
        localStorage.setItem('visionx_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        setTouristProfile(res.data.touristProfile);
        return { success: true, user: res.data.user };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }

  async function quickLogin(role) {
    if (role === 'POLICE') {
      return login('control@police.visionx.gov', 'police123');
    }
    if (role === 'ADMIN') {
      return login('admin@visionx.gov', 'admin123');
    }
    if (role === 'TOURIST') {
      return login('yashodip@visionx.gov', 'tourist123');
    }
  }

  function logout() {
    localStorage.removeItem('visionx_token');
    setToken(null);
    setUser(null);
    setTouristProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        touristProfile,
        token,
        loading,
        error,
        login,
        quickLogin,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
