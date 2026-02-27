import axios from 'axios';
import { toastError, toastInfo } from '@/lib/toast';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail;
    const message = typeof detail === 'string' && detail.trim() ? detail : '';
    if (typeof window !== 'undefined') {
      if (status === 401) {
        toastInfo('Session expired. Please login again.');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_role');
        window.location.href = '/login';
      }
      if (status === 403) {
        toastError(message || 'You do not have permission to perform this action.');
      }
      if (status && status >= 500) {
        toastError('Something went wrong. Please try again.');
      }
      if (!status) {
        toastError('Network error. Please check your connection.');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
