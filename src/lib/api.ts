import axios, { AxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("access_token");
      if (token) {
        config.headers = config.headers ?? {};
        (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = (error.config ?? {}) as AxiosRequestConfig & { _retry?: boolean };

    // Check for network errors
    if (!error.response) {
      // Network error (no response from server)
      const isOffline = !navigator.onLine;
      const networkError = new Error(
        isOffline 
          ? "No internet connection. Please check your network and try again."
          : "Network error. Unable to reach the server. Please try again."
      );
      networkError.name = "NetworkError";
      return Promise.reject(networkError);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = typeof window !== "undefined" ? window.localStorage.getItem("refresh_token") : null;
        const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data as { access: string };
        if (typeof window !== "undefined") {
          window.localStorage.setItem("access_token", access);
        }

        originalRequest.headers = originalRequest.headers ?? {};
        // Ensure Authorization header is set correctly on the retry request
        (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("access_token");
          window.localStorage.removeItem("refresh_token");
          window.location.href = "/signin";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
