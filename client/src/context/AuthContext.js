// client/src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Set up axios defaults
  axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  // Configure axios to include auth token with requests
  axios.interceptors.request.use(
    config => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    error => {
      return Promise.reject(error);
    }
  );
  
  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await axios.get('/api/auth/me');
        setCurrentUser(res.data);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Register new user
  const register = async (username, email, password) => {
    try {
      const res = await axios.post('/api/auth/register', {
        username,
        email,
        password
      });
      
      localStorage.setItem('token', res.data.token);
      setCurrentUser(res.data.user);
      setIsAuthenticated(true);
      return res.data;
    } catch (error) {
      throw error.response.data;
    }
  };
  
  // Login user
  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/auth/login', {
        email,
        password
      });
      
      localStorage.setItem('token', res.data.token);
      setCurrentUser(res.data.user);
      setIsAuthenticated(true);
      return res.data;
    } catch (error) {
      throw error.response.data;
    }
  };
  
  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };
  
  const value = {
    currentUser,
    isAuthenticated,
    loading,
    register,
    login,
    logout
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}