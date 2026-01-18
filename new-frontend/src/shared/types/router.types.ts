/**
 * Type definitions for React Router navigation state
 */

/**
 * Location state passed from signup page to login page after successful registration
 */
export interface LoginLocationState {
  successMessage?: string;
  from?: {
    pathname: string;
  };
}

/**
 * Generic location state interface for navigation
 */
export interface NavigationState {
  from?: {
    pathname: string;
  };
}
