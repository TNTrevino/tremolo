import { apiClient, isOk } from "./axiosInstance";
import {
	LoginRequest,
	LoginResponse,
	User,
	AuthError,
	RegisterRequest,
	RegisterResponse,
} from "../models/models";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

// TODO: think about adding a fallback message
export const AuthService = {
	async login(email: string, password: string): Promise<LoginResponse> {
		const loginData: LoginRequest = { email, password };
		const response = await apiClient.post<LoginResponse | AuthError>(
			"/api/auth/login",
			loginData,
		);

		if (!isOk(response)) {
			const errorData = response.data as AuthError;
			throw new Error(errorData.error || "Login failed. Please try again.");
		}

		const data = response.data as LoginResponse;

		if (data.access_token && data.refresh_token) {
			localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
			localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
		}
		console.log(data);

		return data;
	},

	async getCurrentUser(): Promise<User> {
		const token = this.getToken();
		if (!token) {
			throw new Error("No authentication token found");
		}

		const response = await apiClient.get<User | AuthError>("/api/auth/me");
		if (!isOk(response)) {
			this.logout();

			// custom error response. oh yea
			const errorData = response.data as AuthError;
			throw new Error(errorData.error); // maybe we should add an or here?
		}

		return response.data as User;
	},

	// TODO: can we make the user login right after?
	async register(userData: RegisterRequest): Promise<RegisterResponse> {
		const response = await apiClient.post<RegisterResponse | AuthError>(
			"/api/auth/register",
			userData,
		);
		if (!isOk(response)) {
			const errorData = response.data as AuthError;
			throw new Error(errorData.error);
		}

		return response.data as RegisterResponse;
	},

	async refreshAccessToken(): Promise<string> {
		const refreshToken = this.getRefreshToken();
		if (!refreshToken) {
			throw new Error("No refresh token available");
		}

		const response = await apiClient.post<{ access_token: string } | AuthError>(
			"/api/auth/refresh",
			{ refresh_token: refreshToken },
		);
		if (!isOk(response)) {
			this.logout();
			throw new Error("Session expired. Please login again.");
		}

		const data = response.data as { access_token: string };
		localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
		return data.access_token;
	},

	isAuthenticated(): boolean {
		return !!this.getToken();
	},

	// helper methods
	logout(): void {
		localStorage.removeItem(ACCESS_TOKEN_KEY);
		localStorage.removeItem(REFRESH_TOKEN_KEY);
	},

	getToken(): string | null {
		return localStorage.getItem(ACCESS_TOKEN_KEY);
	},

	getRefreshToken(): string | null {
		return localStorage.getItem(REFRESH_TOKEN_KEY);
	},
};
