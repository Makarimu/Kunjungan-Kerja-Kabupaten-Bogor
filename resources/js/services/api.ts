import axios from 'axios';
import { getApiUrl, getBasePath } from '../utils/url';

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request Interceptor: Sisipkan Token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token');
    const isAuthOrAdminRoute = config.url?.includes('/admin') || config.url?.includes('/auth');
    if (token && isAuthOrAdminRoute) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Tangani Token Expired/Unauthorized
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Hanya redirect ke login jika bukan request auth/login itu sendiri
      if (!error.config.url.includes('/auth/login')) {
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_nama');
        sessionStorage.removeItem('admin_last_activity');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_nama');
        localStorage.removeItem('admin_last_activity');
        const basePath = getBasePath();
        const currentPath = window.location.pathname;
        const adminPath = `${basePath}/admin`;
        const loginPath = `${basePath}/login`;

        if (currentPath.startsWith(adminPath) && currentPath !== loginPath) {
          window.location.href = loginPath;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
