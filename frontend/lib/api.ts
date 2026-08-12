import axios from 'axios';
import API_BASE_URL from './config';
import { clearAuth } from './auth';

/**
 * Pre-configured Axios instance pointing to the Spring Boot backend.
 * Automatically attaches the JWT token from localStorage.
 * Equivalent of the axios calls throughout the React components.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach Bearer token & handle FormData
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Response interceptor — redirect to /login on 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
