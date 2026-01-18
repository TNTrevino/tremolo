/**
 * API response types and data transfer objects (DTOs)
 */

import { User } from './user.types';

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  user: User;
  token?: string;
}

/**
 * Signup request payload
 */
export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'parent';
}

/**
 * Signup response
 */
export interface SignupResponse {
  user: User;
  token?: string;
}

/**
 * Error response from API
 */
export interface ApiError {
  status: number;
  message: string;
  details?: Record<string, string[]>;
}
