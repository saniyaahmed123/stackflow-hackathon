import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('stockflow_token');
    if (!token) {
      setLoading(false);
      return undefined;
    }
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (active) setUser(data.data);
      })
      .catch(() => localStorage.removeItem('stockflow_token'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveSession = (data) => {
    localStorage.setItem('stockflow_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return saveSession(data.data);
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return saveSession(data.data);
  };

  const logout = () => {
    localStorage.removeItem('stockflow_token');
    setUser(null);
  };

  const setProfile = (updated) => setUser(updated);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
