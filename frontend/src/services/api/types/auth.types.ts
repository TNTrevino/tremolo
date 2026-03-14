/**
 * Authentication and User Type Definitions
 *
 * Types for user authentication, registration, and session management.
 * Used with the Go backend (port 5001).
 *
 * ApiUser  – snake_case shape returned by the API
 * User     – camelCase shape used throughout the frontend
 */

export type UserRole = "STUDENT" | "TEACHER" | "PARENT";

export interface ApiUser {
	id: number;
	email: string;
	first_name: string;
	last_name: string;
	role: UserRole;
}

export interface User {
	id: number;
	email: string;
	firstName: string;
	lastName: string;
	role: UserRole;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface LoginResponse {
	user: ApiUser;
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
	user: ApiUser;
}

export interface RefreshTokenRequest {
	refresh_token: string;
}

export interface RefreshTokenResponse {
	access_token: string;
	refresh_token: string;
}

export interface PasswordRequirement {
	label: string;
	met: boolean;
}
