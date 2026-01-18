/**
 * API Type Definitions
 * 
 * This file contains all TypeScript types and interfaces that mirror the backend API contracts.
 * These types are used throughout the application for type-safe API communication.
 */

// ============================================================================
// Auth & User Types (Go Backend - Port 5001)
// ============================================================================

/**
 * User roles in the system
 */
export type UserRole = 'student' | 'teacher' | 'parent';

/**
 * User information returned from API responses
 */
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response with tokens and user data
 */
export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

/**
 * Registration request payload
 */
export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

/**
 * Registration response
 */
export interface RegisterResponse {
  message: string;
  user: User;
}

/**
 * Refresh token request payload
 */
export interface RefreshTokenRequest {
  refresh_token: string;
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

// ============================================================================
// Note Game Types (Go Backend - Port 5001)
// ============================================================================

/**
 * Note game entry request payload
 */
export interface CreateNoteGameEntryRequest {
  time_length: string; // Format: "HH:MM:SS"
  total_questions: number;
  correct_questions: number;
  user_id: number;
  notes_per_minute: number;
}

/**
 * Note game entry response
 */
export interface NoteGameEntry {
  id: number;
  user_id: number;
  time_length: string;
  total_questions: number;
  correct_questions: number;
  notes_per_minute: number;
  created_date: string;
}

/**
 * Create note game entry response
 */
export interface CreateNoteGameEntryResponse {
  message: string;
  id: number;
}

// ============================================================================
// User Info Types (Go Backend - Port 5001)
// ============================================================================

/**
 * General user information including stats
 */
export interface GeneralUserInfo {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  created_at: string;
  total_sessions?: number;
  total_questions?: number;
  average_accuracy?: number;
  average_npm?: number;
}

// ============================================================================
// Chart/Analytics Types (Go Backend - Port 5001)
// ============================================================================

/**
 * Single data point for chart visualization
 */
export interface ChartDataPoint {
  x: string; // ISO timestamp
  y: number; // Value
}

/**
 * Multi-metric chart data for analytics dashboard
 */
export interface MultiMetricChartData {
  npm: ChartDataPoint[];
  accuracy: ChartDataPoint[];
  sessionCount: ChartDataPoint[];
  totalQuestions: ChartDataPoint[];
}

/**
 * Valid time intervals for chart data aggregation
 */
export type ChartInterval = 'day' | 'week' | 'month' | 'year' | 'all';

/**
 * Chart data query parameters
 */
export interface ChartQueryParams {
  interval?: ChartInterval;
  days?: number;
}

// ============================================================================
// Music Generation Types (Django Backend - Port 8000)
// ============================================================================

/**
 * Mary Had a Little Lamb generation request
 */
export interface MaryRequest {
  tonic: string; // Root note (C, D, E, F, G, A, B, optionally with # or -)
  octave: number; // Octave number (e.g., 4)
}

/**
 * Random notes generation request
 */
export interface RandomNotesRequest {
  rhythm: string; // Rhythm pattern as digit string (e.g., "1111", "112")
  rhythmType: number; // Note duration type (8 for eighth, 16 for sixteenth)
  tonic: string; // Root note for scale
}

/**
 * Note game generation request
 */
export interface NoteGameRequest {
  scale: string; // Scale root note (e.g., "C", "D#")
  octave: string; // Octave as string (e.g., "4")
}

/**
 * Note game generation response
 */
export interface NoteGameResponse {
  generatedXml: string; // MusicXML content
  noteName: string; // Generated note name (e.g., "C", "D#")
  noteOctave: string; // Generated note octave
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Standard API error response
 */
export interface ApiError {
  error: string;
  message?: string;
  status?: number;
}

/**
 * API response wrapper for consistent error handling
 */
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}
