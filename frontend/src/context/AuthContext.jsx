import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Auth State from Local Storage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        setUser(JSON.parse(savedUser));
        setLoading(false); // Stop loading immediately to prevent flicker, verify in background
        try {
          // Verify token by calling /me
          const response = await api.get('/me');
          if (response.data) {
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
          }
        } catch (error) {
          console.error("Session expired or invalid token", error);
          logout();
        }
      } else {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signup = async (username, email, password) => {
    try {
      await api.post('/auth/signup', { username, email, password });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.detail || "Signup failed. Please try again." 
      };
    }
  };

  const login = async (email, password) => {
    try {
      const formData = new FormData();
      formData.append('username', email); // FastAPI OAuth2 expects 'username' as email
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        // Fetch user info
        const userResponse = await api.get('/me');
        setUser(userResponse.data);
        localStorage.setItem('user', JSON.stringify(userResponse.data));
        return { success: true };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.detail || "Login failed. Please check your credentials." 
      };
    }
  };

  const googleLogin = async (tokenId) => {
    try {
      const response = await api.post('/auth/google', { token: tokenId });
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        // Fetch user info
        const userResponse = await api.get('/me');
        setUser(userResponse.data);
        localStorage.setItem('user', JSON.stringify(userResponse.data));
        return { success: true };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.detail || "Google authentication failed." 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedLang');
    
    // Clear Google Translate Cookie
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname;
    
    setUser(null);
    window.location.reload(); // Refresh to ensure the translation is reset
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
