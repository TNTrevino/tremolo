/**
 * Authentication and User Type Definitions
 *
 * Types for user authentication, registration, and session management.
 * Used with the Go backend (port 5001).
 */

export type UserRole = "student" | "teacher" | "parent";

export interface User {
	id: number;
	email: string;
	first_name: string;
	last_name: string;
	role: UserRole;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface LoginResponse {
	user: User;
	access_token: string;
	refresh_token: string;
}

export interface RegisterRequest {
	email: string;
	password: string;
	first_name: string;
	last_name: string;
	role: UserRole;
}

export interface RegisterResponse {
	message: string;
	user: User;
}

export interface RefreshTokenRequest {
	refresh_token: string;
}

export interface RefreshTokenResponse {
	access_token: string;
	refresh_token: string;
}
