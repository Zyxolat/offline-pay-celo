import { clearSession } from '@/lib/auth';
import axios from 'axios';

function normalizeApiBaseUrl(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return '/api';
  }

  if (trimmed === '/api') {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const normalized = trimmed.replace(/\/+$/, '');
    return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
  }

  return trimmed.startsWith('/') ? trimmed.replace(/\/+$/, '') : `/${trimmed.replace(/\/+$/, '')}`;
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

if (!import.meta.env.VITE_API_URL) {
  console.warn('[api] VITE_API_URL is missing. Falling back to /api.');
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('sessionToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[api] Request failed', {
      method: error.config?.method,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });

    if (!error.response && error.code === 'ERR_NETWORK') {
      error.message =
        'Cannot reach the API server. Start the backend on port 3001 and make sure Postgres is running.';
    }

    if (error.response?.status === 401) {
      const path = window.location.pathname;
      const isAdminRoute = path.startsWith('/admin');
      const isAdminApi = String(error.config?.url || '').includes('/admin/');

      if (!isAdminRoute && !isAdminApi) {
        clearSession();
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
