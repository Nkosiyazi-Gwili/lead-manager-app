import axios from 'axios';

// Configure axios base URL - POINT TO YOUR BACKEND
axios.defaults.baseURL = 'https://lead-manager-back-end-app-i5rw.vercel.app';
//axios.defaults.withCredentials = true;

// Add auth token to requests
axios.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axios;