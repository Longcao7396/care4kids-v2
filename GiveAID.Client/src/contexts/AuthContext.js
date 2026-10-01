import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authService } from '../services/authService';
import { STORAGE_KEYS } from '../config';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check auth on mount
  useEffect(() => {
    const initAuth = () => {
      const storedUser = authService.getStoredUser();
      if (storedUser && authService.isAuthenticated()) {
        setUser(storedUser);
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = useCallback(async (credentials) => {
    // authService.login() returns the raw token object { token, userId, email, username, role, expiresAt }
    // directly (api.js interceptor already unwraps the { success, message, data } envelope).
    // It throws an Error on failure with .response.data preserved from the axios error.
    let result;
    try {
      result = await authService.login(credentials);
    } catch (err) {
      // Preserve the server's specific error code/message (e.g. EMAIL_NOT_VERIFIED,
      // INVALID_CREDENTIALS) instead of overwriting with a generic message.
      const status = err.response?.status;
      const code = err.response?.data?.code;
      const serverMsg = err.response?.data?.message || err.message;
      const userMessage =
        code === 'EMAIL_NOT_VERIFIED'
          ? 'Please verify your email before logging in. Check your inbox for the verification link.'
          : code === 'INVALID_CREDENTIALS' || status === 401
          ? 'Invalid username or password.'
          : serverMsg || 'Login failed. Please try again.';
      const error = new Error(userMessage);
      error.response = { status, data: { ...(err.response?.data || {}), message: userMessage, code } };
      error.code = code;
      throw error;
    }
    if (!result || !result.token) {
      const error = new Error('Login failed. Please check your credentials and try again.');
      error.response = { data: { message: 'Invalid username or password.', code: 'INVALID_CREDENTIALS' } };
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }
    // Store user info (exclude token from localStorage user object).
    const { token: _t, ...userInfo } = result;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userInfo));
    setUser(userInfo);
    return result; // Returns { token, userId, email, username, role, expiresAt }
  }, []);

  const register = useCallback(async (userData) => {
    // authService.register() returns { success, message } on success.
    // On failure it throws an Error with .response.data.message set by api.js interceptor.
    const result = await authService.register(userData);
    if (!result || !result.success) {
      const msg = result?.message || 'Registration failed';
      const error = new Error(msg);
      error.response = { data: { message: msg } };
      throw error;
    }
    return result; // { success: true, message: '...' }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  // Refresh the cached user object from localStorage (used after profile
  // updates so the navbar/sidebar reflect the new name).
  const refreshUser = useCallback(() => {
    const storedUser = authService.getStoredUser();
    if (storedUser) setUser(storedUser);
    return Promise.resolve(storedUser);
  }, []);

  // SECURITY/CONSISTENCY: isAuthenticated and isAdmin are plain booleans.
  // The previous version had isAdmin/isSuperAdmin as functions and the
  // call sites mixed styles (some with parens, some without), which silently
  // always evaluated truthy when callers forgot the parens. Standardising
  // on plain booleans keeps call sites read consistently:
  //
  //   {isAdmin && <AdminNav />}                // no parens
  //   if (isAdmin) { ... }                     // no parens
  //
  // Note: the application has a single highest administrative role, "Admin".
  // There is no SuperAdmin role in this codebase.
  const isAuthenticated = !!user;
  const isAdmin = !!(user && user.role === 'Admin');

  const value = useMemo(() => ({
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated,
    isAdmin
  }), [user, loading, login, register, logout, refreshUser, isAuthenticated, isAdmin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
