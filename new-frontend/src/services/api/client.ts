/**
 * API Client Configuration
 * 
 * This module configures axios instances for communication with backend services:
 * - Music Generation Service (Django, port 8000)
 * - User Tracking Service (Go, port 5001)
 * 
 * Includes request/response interceptors for authentication and error handling.
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiError } from './types';

// ============================================================================
// Token Management
// ============================================================================

const TOKEN_STORAGE_KEY = 'access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';

/**
 * Get the current access token from localStorage
 */
export const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

/**
 * Get the current refresh token from localStorage
 */
export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
};

/**
 * Store access and refresh tokens
 */
export const setTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
};

/**
 * Clear all stored tokens
 */
export const clearTokens = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
};

// ============================================================================
// Music API Client (Django Backend - Port 8000)
// ============================================================================

/**
 * Axios instance for music generation endpoints
 * - No authentication required
 * - Returns MusicXML content
 */
export const musicApiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_MUSIC || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Music API Response Interceptor - Handle errors
musicApiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const apiError: ApiError = {
      error: error.message,
      message: error.response?.data ? String(error.response.data) : 'Music generation failed',
      status: error.response?.status,
    };
    return Promise.reject(apiError);
  }
);

// ============================================================================
// Main API Client (Go Backend - Port 5001)
// ============================================================================

/**
 * Axios instance for user tracking, authentication, and analytics endpoints
 * - Requires JWT authentication for most endpoints
 * - Automatically attaches access tokens
 * - Handles token refresh on 401 errors
 */
export const mainApiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_MAIN || 'http://localhost:5001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// Request Interceptor - Attach JWT Token
// ============================================================================

mainApiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    
    // Attach authorization header if token exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ============================================================================
// Response Interceptor - Handle Authentication & Errors
// ============================================================================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

/**
 * Process queued requests after token refresh
 */
const processQueue = (error: Error | null = null): void => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  
  failedQueue = [];
};

mainApiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized - Attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until token refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return mainApiClient(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      const refreshToken = getRefreshToken();
      
      if (!refreshToken) {
        // No refresh token available, clear tokens and redirect to login
        clearTokens();
        processQueue(new Error('No refresh token available'));
        isRefreshing = false;
        
        // Dispatch custom event for authentication failure
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        const apiError: ApiError = {
          error: 'Authentication failed',
          message: 'Please log in again',
          status: 401,
        };
        return Promise.reject(apiError);
      }
      
      try {
        // Attempt to refresh the access token
        const response = await axios.post(
          `${import.meta.env.VITE_BACKEND_MAIN || 'http://localhost:5001'}/api/auth/refresh`,
          { refresh_token: refreshToken }
        );
        
        const { access_token, refresh_token: new_refresh_token } = response.data;
        
        // Store new tokens
        setTokens(access_token, new_refresh_token);
        
        // Update authorization header for original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        
        // Process queued requests
        processQueue();
        isRefreshing = false;
        
        // Retry original request
        return mainApiClient(originalRequest);
      } catch (refreshError) {
        // Token refresh failed, clear tokens and redirect to login
        processQueue(refreshError as Error);
        isRefreshing = false;
        clearTokens();
        
        // Dispatch custom event for authentication failure
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        const apiError: ApiError = {
          error: 'Token refresh failed',
          message: 'Please log in again',
          status: 401,
        };
        return Promise.reject(apiError);
      }
    }
    
    // Handle other errors
    const apiError: ApiError = {
      error: error.message,
      message: error.response?.data 
        ? (typeof error.response.data === 'object' && 'error' in error.response.data
          ? String(error.response.data.error)
          : String(error.response.data))
        : error.message,
      status: error.response?.status,
    };
    
    return Promise.reject(apiError);
  }
);

// ============================================================================
// Export
// ============================================================================

export { TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY };
