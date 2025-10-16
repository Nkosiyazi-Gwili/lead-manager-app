'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (userData: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Use environment variable for better configuration
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://lead-manager-backend-app-piyv.vercel.app';

// Configure axios with better error handling
const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Enhanced error handler
const handleApiError = (error: any): string => {
  console.error('API Error:', error);

  // Network errors
  if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
    return 'Cannot connect to server. Please check your internet connection.';
  }

  if (error.code === 'ERR_CANCELED') {
    return 'Request was cancelled. Please try again.';
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
        if (data?.code === 'DATABASE_UNAVAILABLE') {
          return 'Service is temporarily unavailable. Please try again in a few minutes.';
        }
        return 'Service temporarily unavailable. Please try again later.';
      
      case 500:
        return 'Server error occurred. Please try again later.';
      
      case 401:
        return data?.message || 'Invalid credentials. Please check your email and password.';
      
      case 400:
        return data?.message || 'Invalid request. Please check your input.';
      
      case 404:
        return 'Service endpoint not found. Please contact support.';
      
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      
      default:
        return data?.message || `Unexpected error (${status}). Please try again.`;
    }
  }

  // Unknown errors
  return 'An unexpected error occurred. Please try again.';
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Clear error function
  const clearError = () => setError(null);

  useEffect(() => {
    // Configure axios interceptors
    const requestInterceptor = api.interceptors.request.use((config) => {
      // Clear any previous errors when making a new request
      clearError();
      
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        const errorMessage = handleApiError(error);
        setError(errorMessage);

        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            setUser(null);
            router.push('/login');
          }
        }
        return Promise.reject(error);
      }
    );

    // Check for token and validate it
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [router]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get('/api/auth/me');
      if (response.data.success) {
        setUser(response.data.user);
      } else {
        throw new Error(response.data.message || 'Failed to fetch user profile');
      }
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error);
      
      // Don't clear token for temporary errors (like 503)
      if (error.response?.status !== 503) {
        localStorage.removeItem('token');
        setUser(null);
      }
      
      const errorMessage = handleApiError(error);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      setLoading(true);
      clearError();

      const response = await api.post('/api/auth/login', { email, password });
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        setUser(user);
        
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      
      return { 
        success: false, 
        message: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any): Promise<{ success: boolean; message?: string }> => {
    try {
      setLoading(true);
      clearError();

      const config = {
        headers: {} as any
      };

      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const response = await api.post('/api/auth/register', userData, config);
      
      if (response.data.success) {
        const { token: newToken, user } = response.data;
        
        if (!token) {
          localStorage.setItem('token', newToken);
          setUser(user);
        }
        
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      
      return { 
        success: false, 
        message: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    clearError();
    router.push('/login');
  };

  const value: AuthContextType = {
    user,
    login,
    register,
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