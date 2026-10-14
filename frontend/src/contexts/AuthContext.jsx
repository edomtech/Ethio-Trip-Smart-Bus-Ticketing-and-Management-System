import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';
import { storage, migrateLegacyStorage } from '../utils/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback((reason) => {
    setUser(null);
    setToken(null);
    storage.clearAuth();
    if (reason) console.warn(`[Auth] Session ended: ${reason}`);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      migrateLegacyStorage();

      const savedToken = storage.getToken();
      const savedUser = storage.getUser();

      if (!savedToken || !savedUser) {
        setLoading(false);
        return;
      }

      let parsed = null;
      try {
        parsed = JSON.parse(savedUser);
      } catch {
        logout('corrupt stored session');
        setLoading(false);
        return;
      }

      setUser(parsed);
      setToken(savedToken);

      try {
        const { user: fresh } = await authAPI.getProfile();
        if (cancelled) return;
        setUser(fresh);
        storage.setUser(JSON.stringify(fresh));
      } catch {
        if (cancelled) return;
        logout('token rejected by server');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadUser();
    return () => { cancelled = true; };
  }, [logout]);

  useEffect(() => {
    const handleUnauthorized = () => logout('401 from server');
    window.addEventListener('ethiotrip:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('ethiotrip:unauthorized', handleUnauthorized);
  }, [logout]);

  const login = useCallback((userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    storage.setUser(JSON.stringify(userData));
    storage.setToken(authToken);
    if (userData?.preferredLanguage) {
      storage.setLanguage(userData.preferredLanguage);
    }
  }, []);

  const updateUser = useCallback((updatedData) => {
    setUser((prev) => {
      const next = { ...prev, ...updatedData };
      storage.setUser(JSON.stringify(next));
      return next;
    });
    if (updatedData?.preferredLanguage) {
      storage.setLanguage(updatedData.preferredLanguage);
      authAPI.updateProfile({ preferredLanguage: updatedData.preferredLanguage }).catch(() => {});
    }
  }, []);

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