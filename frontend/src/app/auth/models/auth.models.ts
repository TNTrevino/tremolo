/**
 * Authentication and user types.
 *
 * Ported verbatim from frontend-react/src/services/api/types/auth.types.ts.
 * The Go service speaks snake_case (`ApiUser`); everything inside the app
 * speaks camelCase (`User`). `mapApiUserToUser` is the only crossing point.
 */

export type UserRole = "STUDENT" | "TEACHER" | "PARENT" | "BASIC";

export interface ApiUser {
	id: number;
	email: string;
	first_name: string;
	last_name: string;
	role: UserRole;
	has_google?: boolean;
}

export interface User {
	id: number;
	email: string;
	firstName: string;
	lastName: string;
	role: UserRole;
	hasGoogle?: boolean;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface LoginResponse {
	user: ApiUser;
	access_token: string;
	refresh_token: string;
	account_linked?: boolean;
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

export interface GoogleCallbackRequest {
	code: string;
	redirect_uri: string;
}
