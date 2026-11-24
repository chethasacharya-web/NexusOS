import { createContext, useContext, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nexus_user')); } catch { return null; }
  });

  async function login(email, password) {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('nexus_token', data.token);
    localStorage.setItem('nexus_user', JSON.stringify(data.user));
    setUser(data.user);
  }

  async function register(form) {
    const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(form) });
    localStorage.setItem('nexus_token', data.token);
    localStorage.setItem('nexus_user', JSON.stringify(data.user));
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
