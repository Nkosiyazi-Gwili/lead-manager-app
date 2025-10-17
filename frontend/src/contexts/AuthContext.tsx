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

// 🚨 FIX: Use HTTPS instead of HTTP
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://lead-manager-back-end-app-xdi1.vercel.app';

// Configure axios
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

  // CORS specific errors
  if (error.code === 'ERR_NETWORK' || error.message.includes('CORS')) {
    return 'Cannot connect to the server. Please check your internet connection and try again.';
  }

  if (error.code === 'ECONNREFUSED') {
    return 'Server is unavailable. Please try again later.';
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
      default:
        return data?.message || `Unexpected error (${status}). Please try again.`;
    }
  }

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

  const clearError = () => setError(null);

  useEffect(() => {
    // Request interceptor
    const requestInterceptor = api.interceptors.request.use((config) => {
      clearError();
      
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    // Response interceptor
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

    // Check for existing token
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
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      setLoading(true);
      clearError();

      console.log('🔐 Attempting login to:', `${BACKEND_URL}/api/auth/login`);
      
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