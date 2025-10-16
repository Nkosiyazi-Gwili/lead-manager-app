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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Use environment variable for better configuration
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://lead-manager-backend-app-piyv.vercel.app';

// Configure axios once
axios.defaults.baseURL = BACKEND_URL;
//.defaults.withCredentials = true;

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
  const router = useRouter();

  // Add this function to your AuthContext to test the connection
  const testConnection = async () => {
    try {
      const response = await axios.post('/api/auth/simple-login', {
        email: 'test@test.com',
        password: 'test123'
      });
      console.log('✅ Simple login test:', response.data);
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('❌ Simple login test failed:', error);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    // Configure axios interceptors
    const requestInterceptor = axios.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
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
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [router]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error);
      // Clear invalid token
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, data } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(data.user);
      
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      
      let message = 'Login failed. Please check your credentials.';
      
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
        message = 'Cannot connect to server. Please try again later.';
      } else if (error.response?.status >= 500) {
        message = 'Server error. Please try again later.';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      
      return { 
        success: false, 
        message 
      };
    }
  };

  const register = async (userData: any) => {
    try {
      const config = {
        headers: {} as any
      };

      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const response = await axios.post('/api/auth/register', userData, config);
      const { token: newToken, data } = response.data;
      
      if (!token) {
        localStorage.setItem('token', newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setUser(data.user);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed. Please try again.' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    router.push('/login');
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}