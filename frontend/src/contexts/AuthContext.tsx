// contexts/AuthContext.tsx
'use client';

import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Determine backend URL based on environment
const getBackendUrl = () => {
  // If we're in the browser
  if (typeof window !== 'undefined') {
    const isProduction = window.location.hostname.includes('vercel.app');
    
    if (isProduction) {
      return 'https://lead-manager-back-end-app-i5rw.vercel.app';
    }
  }
  
  // Default to localhost for development
  return 'http://localhost:5000';
};

const BACKEND_URL = getBackendUrl();

// Configure axios
const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000, // Increased timeout for production
  headers: {
    'Content-Type': 'application/json',
  },
});

// Enhanced error handler
const handleApiError = (error: any): string => {
  console.error('API Error:', error);

  // Network errors
  if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
    return 'Cannot connect to the server. Please check your internet connection and try again.';
  }

  if (error.code === 'ECONNREFUSED') {
    return 'Server is unavailable. Please try again later.';
  }

  // CORS specific errors
  if (error.code === 'ERR_CANCELED' || error.message.includes('CORS')) {
    return 'Connection blocked by browser security. Please check if the server is running and accessible.';
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED') {
    return 'Request timeout. Please try again.';
  }

  // HTTP status code errors
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      case 500:
        return 'Server error occurred. Please try again later.';
      case 401:
        return data?.message || 'Invalid credentials. Please check your email and password.';
      case 400:
        return data?.message || 'Invalid request. Please check your input.';
      case 404:
        return 'Service endpoint not found.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      default:
        return data?.message || `Unexpected error (${status}). Please try again.`;
    }
  }

  return 'An unexpected error occurred. Please try again.';
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const clearError = () => setError(null);

  useEffect(() => {
    console.log('🔄 Initializing AuthProvider...');
    console.log('🌐 Backend URL:', BACKEND_URL);
    console.log('📍 Current hostname:', typeof window !== 'undefined' ? window.location.hostname : 'server');

    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await api.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          setUser(response.data.user);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string; user?: User }> => {
    try {
      setLoading(true);
      clearError();

      console.log('🔐 Attempting login to:', `${BACKEND_URL}/api/auth/login`);
      
      const response = await api.post('/api/auth/login', { email, password });
      
      if (response.data.success) {
        const { token, user: userData } = response.data;
        
        localStorage.setItem('token', token);
        setUser(userData);
        
        return { success: true, user: userData };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('🚪 Logging out...');
    localStorage.removeItem('token');
    setUser(null);
    clearError();
    router.push('/login');
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    loading,
    error,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};