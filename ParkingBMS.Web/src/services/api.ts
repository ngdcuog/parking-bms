import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for reading/writing HttpOnly cookies for refresh token
});

// Request Interceptor: Attach Authorization JWT
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 and Refresh Token
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and request hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Avoid refreshing on login/register endpoints
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt token refresh via cookies
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const { accessToken } = response.data.data;

        // Fetch user info with new token
        const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true,
        });

        const user = meResponse.data.data;
        useAuthStore.getState().setAuth(user, accessToken);

        processQueue(null, accessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        useAuthStore.getState().clearAuth(); // Force logout
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
