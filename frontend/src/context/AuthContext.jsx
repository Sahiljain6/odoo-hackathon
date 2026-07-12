import { createContext, useContext, useState, useCallback } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('to_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('to_user');
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback(async (email, password) => {
    const { data } = await client.post('/auth/login', { email, password });
    localStorage.setItem('to_token', data.token);
    localStorage.setItem('to_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async ({ name, email, password, role }) => {
    await client.post('/auth/register', { name, email, password, role });
    // registration doesn't log in automatically — caller sends them to login
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('to_token');
    localStorage.removeItem('to_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = { token, user, login, register, logout, isAuthenticated: !!token };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
