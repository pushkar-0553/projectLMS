import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Purge any legacy tokens from localStorage so old browser sessions do not leak
    localStorage.removeItem('token');
    localStorage.removeItem('activeCourseSlug');

    const token = sessionStorage.getItem('token');
    if (token) {
      authAPI.getUser()
        .then(response => {
          setUser({ ...response.data.user, token });
        })
        .catch((error) => {
          console.warn('Failed to get user data:', error);
          const isTokenError = 
            error.response?.status === 401 ||
            (error.response?.status === 403 && 
              (error.response?.data?.message?.toLowerCase().includes('token') || 
               error.response?.data?.message?.toLowerCase().includes('expired')));
          if (isTokenError) {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('activeCourseSlug');
          }
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { token, user } = response.data;
      // Store in sessionStorage so each tab is independently isolated and clears on close
      sessionStorage.setItem('token', token);
      localStorage.removeItem('token'); // clean legacy storage
      setUser({ ...user, token });
      return { success: true, user };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Invalid email or password' 
      };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('activeCourseSlug');
    localStorage.removeItem('token');
    localStorage.removeItem('activeCourseSlug');
    setUser(null);
  };

  const updateUser = (updatedData) => {
    setUser(prev => prev ? { ...prev, ...updatedData } : prev);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
