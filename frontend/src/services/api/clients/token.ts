/**
 * Token Management
 *
 * Handles JWT token storage and retrieval from localStorage.
 */

export const TOKEN_STORAGE_KEY = "access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "refresh_token";

export const getAccessToken = (): string | null => {
	return localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const getRefreshToken = (): string | null => {
	return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
};

export const setTokens = (accessToken: string, refreshToken: string): void => {
	localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
	localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
};

export const clearTokens = (): void => {
	localStorage.removeItem(TOKEN_STORAGE_KEY);
	localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
};
