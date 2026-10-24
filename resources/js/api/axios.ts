import axios from 'axios';
import { getApiUrl, getBasePath } from '../utils/url';

const axiosInstance = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

let isRedirecting = false;

// Interceptor for attaching auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token');
    const isAuthOrAdminRoute = config.url?.includes('/admin') || config.url?.includes('/auth');
    if (token && isAuthOrAdminRoute) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle 401 Unauthorized safely
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
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

      if (!isRedirecting && currentPath.startsWith(adminPath) && currentPath !== loginPath) {
        isRedirecting = true;
        window.location.href = loginPath;
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
