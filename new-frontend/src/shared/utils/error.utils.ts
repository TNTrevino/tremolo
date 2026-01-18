/**
 * Error handling utility functions
 * Provides consistent error handling across the application
 */

import { AxiosError } from 'axios';

/**
 * Extracts a user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (isApiError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    
    // Try to get error message from response data
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
    
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }

    // Handle specific HTTP status codes
    if (axiosError.response?.status) {
      switch (axiosError.response.status) {
        case 400:
          return 'Bad request. Please check your input.';
        case 401:
          return 'You are not authorized. Please log in.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 408:
          return 'Request timeout. Please try again.';
        case 429:
          return 'Too many requests. Please wait a moment.';
        case 500:
          return 'Internal server error. Please try again later.';
        case 502:
          return 'Bad gateway. The server is temporarily unavailable.';
        case 503:
          return 'Service unavailable. Please try again later.';
        default:
          return `Request failed with status ${axiosError.response.status}`;
      }
    }

    // Network errors
    if (axiosError.code === 'ERR_NETWORK') {
      return 'Network error. Please check your internet connection.';
    }

    if (axiosError.code === 'ECONNABORTED') {
      return 'Request timeout. Please try again.';
    }

    return axiosError.message || 'An error occurred while processing your request.';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Checks if an error is an API/Axios error
 */
export function isApiError(error: unknown): error is AxiosError {
  return error instanceof Error && 'isAxiosError' in error && error.isAxiosError === true;
}

/**
 * Logs error to console with context in development mode
 * In production, this could be replaced with a service like Sentry
 */
export function logError(error: unknown, context?: string): void {
  const isDevelopment = import.meta.env.DEV;

  if (isDevelopment) {
    console.group(`🔴 Error ${context ? `in ${context}` : ''}`);
    console.error(error);
    
    if (isApiError(error)) {
      console.log('Request config:', error.config);
      console.log('Response:', error.response);
    }
    
    console.groupEnd();
  } else {
    // In production, you might want to send to an error tracking service
    console.error('Error occurred:', getErrorMessage(error));
  }
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!isApiError(error)) return false;
  
  return (
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED' ||
    error.message.toLowerCase().includes('network')
  );
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (!isApiError(error)) return false;
  
  return error.response?.status === 401 || error.response?.status === 403;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  if (!isApiError(error)) return false;
  
  return error.response?.status === 400 || error.response?.status === 422;
}

/**
 * Type guard for checking if an error has a specific status code
 */
export function hasStatusCode(error: unknown, statusCode: number): boolean {
  if (!isApiError(error)) return false;
  return error.response?.status === statusCode;
}
