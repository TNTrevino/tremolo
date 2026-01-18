/**
 * Authentication Service
 *
 * Handles user authentication operations including login, registration,
 * token management, and user session retrieval.
 *
 * All endpoints communicate with the Go backend (port 5001).
 */

import { mainApiClient, setTokens, clearTokens, getRefreshToken } from './client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  User,
} from './types';

/**
 * Login user with email and password
 *
 * @param credentials - User login credentials
 * @returns Promise with user data and authentication tokens
 * @throws ApiError if login fails
 *
 * @example
 * ```typescript
 * const response = await authService.login({
 *   email: 'student@example.com',
 *   password: 'SecurePass123!'
 * });
 * console.log(response.user.first_name);
 * ```
 */
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await mainApiClient.post<LoginResponse>('/api/auth/login', credentials);

  // Store tokens in localStorage
  setTokens(response.data.access_token, response.data.refresh_token);

  return response.data;
};

/**
 * Register a new user account
 *
 * @param userData - User registration data
 * @returns Promise with registration confirmation and user data
 * @throws ApiError if registration fails (e.g., email already exists)
 *
 * @example
 * ```typescript
 * const response = await authService.register({
 *   email: 'newstudent@example.com',
 *   password: 'SecurePass123!',
 *   first_name: 'John',
 *   last_name: 'Doe',
 *   role: 'student'
 * });
 * console.log(response.message);
 * ```
 */
export const register = async (userData: RegisterRequest): Promise<RegisterResponse> => {
  const response = await mainApiClient.post<RegisterResponse>('/api/auth/register', userData);
  return response.data;
};

/**
 * Logout current user
 * Clears tokens from localStorage and dispatches logout event
 *
 * @example
 * ```typescript
 * authService.logout();
 * // User is now logged out, tokens cleared
 * ```
 */
export const logout = (): void => {
  clearTokens();

  // Dispatch custom event for app-wide logout handling
  window.dispatchEvent(new CustomEvent('auth:logout'));
};

/**
 * Refresh access token using refresh token
 *
 * Note: This is typically called automatically by the axios interceptor
 * when a 401 response is received. Manual calling is rarely needed.
 *
 * @returns Promise with new access and refresh tokens
 * @throws ApiError if refresh fails
 *
 * @example
 * ```typescript
 * const tokens = await authService.refreshToken();
 * console.log('New access token:', tokens.access_token);
 * ```
 */
export const refreshToken = async (): Promise<RefreshTokenResponse> => {
  const refresh_token = getRefreshToken();

  if (!refresh_token) {
    throw new Error('No refresh token available');
  }

  const payload: RefreshTokenRequest = { refresh_token };
  const response = await mainApiClient.post<RefreshTokenResponse>('/api/auth/refresh', payload);

  // Update stored tokens
  setTokens(response.data.access_token, response.data.refresh_token);

  return response.data;
};

/**
 * Get current authenticated user information
 *
 * Requires valid access token in localStorage
 *
 * @returns Promise with current user data
 * @throws ApiError if not authenticated or request fails
 *
 * @example
 * ```typescript
 * const user = await authService.getCurrentUser();
 * console.log(`Welcome ${user.first_name} ${user.last_name}`);
 * console.log(`Role: ${user.role}`);
 * ```
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await mainApiClient.get<User>('/api/auth/me');
  return response.data;
};

/**
 * Check if user is currently authenticated
 *
 * Note: This only checks for token existence, not validity.
 * Use getCurrentUser() to verify token is still valid.
 *
 * @returns true if access token exists in localStorage
 *
 * @example
 * ```typescript
 * if (authService.isAuthenticated()) {
 *   // Show authenticated UI
 * } else {
 *   // Redirect to login
 * }
 * ```
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('access_token');
};

// Export as default object for convenience
export const authService = {
  login,
  register,
  logout,
  refreshToken,
  getCurrentUser,
  isAuthenticated,
};

export default authService;
