import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const savedToken = localStorage.getItem('ethiobus_token');
      const savedUser = localStorage.getItem('ethiobus_user');
      if (savedToken && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
        } catch (error) {
          console.error('Session load failed:', error);
          logout();
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('ethiobus_user', JSON.stringify(userData));
    localStorage.setItem('ethiobus_token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    // Clear auth tokens
    localStorage.removeItem('ethiobus_user');
    localStorage.removeItem('ethiobus_token');
    authAPI.logout().catch(console.error);
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    localStorage.setItem('ethiobus_user', JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
