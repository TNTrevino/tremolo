import { Injectable } from "@angular/core";

/**
 * JWT storage. Port of frontend-react/src/services/api/clients/token.ts.
 *
 * The keys are unchanged so a session created by the React app is still
 * readable here (and vice versa) while both apps exist.
 */
export const TOKEN_STORAGE_KEY = "access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "refresh_token";

@Injectable({ providedIn: "root" })
export class TokenStorage {
	getAccessToken(): string | null {
		return localStorage.getItem(TOKEN_STORAGE_KEY);
	}

	getRefreshToken(): string | null {
		return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
	}

	setTokens(accessToken: string, refreshToken: string): void {
		localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
		localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
	}

	clearTokens(): void {
		localStorage.removeItem(TOKEN_STORAGE_KEY);
		localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
	}
}
