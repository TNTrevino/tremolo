import type { AxiosInstance } from "axios";
import type {
	LoginRequest,
	LoginResponse,
	RegisterRequest,
	RegisterResponse,
	RefreshTokenRequest,
	RefreshTokenResponse,
	ApiUser,
	GoogleCallbackRequest,
} from "./types";

interface TokenManager {
	setTokens(accessToken: string, refreshToken: string): void;
	clearTokens(): void;
	getRefreshToken(): string | null;
	getAccessToken(): string | null;
}

export class AuthService {
	constructor(
		private client: AxiosInstance,
		private tokenManager: TokenManager,
	) {}

	async login(credentials: LoginRequest): Promise<LoginResponse> {
		const response = await this.client.post<LoginResponse>(
			"/api/auth/login",
			credentials,
		);
		this.tokenManager.setTokens(
			response.data.access_token,
			response.data.refresh_token,
		);
		return response.data;
	}

	async register(userData: RegisterRequest): Promise<RegisterResponse> {
		const response = await this.client.post<RegisterResponse>(
			"/api/auth/register",
			userData,
		);
		return response.data;
	}

	logout(): void {
		this.tokenManager.clearTokens();
		window.dispatchEvent(new CustomEvent("auth:logout"));
	}

	async refreshToken(): Promise<RefreshTokenResponse> {
		const refresh_token = this.tokenManager.getRefreshToken();

		if (!refresh_token) {
			throw new Error("No refresh token available");
		}

		const payload: RefreshTokenRequest = { refresh_token };
		const response = await this.client.post<RefreshTokenResponse>(
			"/api/auth/refresh",
			payload,
		);

		this.tokenManager.setTokens(
			response.data.access_token,
			response.data.refresh_token,
		);

		return response.data;
	}

	async getCurrentUser(): Promise<ApiUser> {
		const response = await this.client.get<ApiUser>("/api/auth/me");
		return response.data;
	}

	isAuthenticated(): boolean {
		return !!this.tokenManager.getAccessToken();
	}

	async googleCallback(request: GoogleCallbackRequest): Promise<LoginResponse> {
		const response = await this.client.post<LoginResponse>(
			"/api/auth/google/callback",
			request,
		);
		this.tokenManager.setTokens(
			response.data.access_token,
			response.data.refresh_token,
		);
		return response.data;
	}

	async linkGoogle(
		request: GoogleCallbackRequest,
	): Promise<{ message: string }> {
		const response = await this.client.post<{ message: string }>(
			"/api/auth/google/link",
			request,
		);
		return response.data;
	}
}
