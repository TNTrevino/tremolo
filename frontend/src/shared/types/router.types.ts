/**
 * Type definitions for React Router navigation state
 */

/**
 * Location state passed from signup page to login page after successful registration
 */
export interface LoginLocationState {
	successMessage?: string;
	errorMessage?: string;
	from?: {
		pathname: string;
	};
}

/**
 * Location state passed to dashboard after OAuth account linking
 */
export interface DashboardLocationState {
	infoMessage?: string;
}

/**
 * Generic location state interface for navigation
 */
export interface NavigationState {
	from?: {
		pathname: string;
	};
}
