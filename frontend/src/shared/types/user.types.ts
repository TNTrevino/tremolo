/**
 * User-related type definitions
 */

/**
 * User role types
 */
export type UserRole = "student" | "teacher" | "parent";

/**
 * Complete user object returned from authentication
 */
export interface User {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: UserRole;
	joinDate: string;
}

/**
 * Data required for user signup
 */
export interface SignupData {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	role: UserRole;
}

/**
 * Context type for authentication provider
 */
export interface AuthContextType {
	user: User | null;
	login: (email: string, password: string) => Promise<boolean>;
	signup: (data: SignupData) => Promise<boolean>;
	logout: () => void;
	isAuthenticated: boolean;
}
