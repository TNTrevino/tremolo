/**
 * Main API Client
 *
 * Axios instance for the Go user tracking backend (port 5001).
 * Includes JWT authentication with automatic token refresh.
 */

import type {
	AxiosError,
	AxiosInstance,
	InternalAxiosRequestConfig,
	AxiosResponse,
} from "axios";
import axios from "axios";
import type { ApiError } from "../types";
import {
	getAccessToken,
	getRefreshToken,
	setTokens,
	clearTokens,
} from "./token";
import { logger } from "@/lib/logger";

export const mainApiClient: AxiosInstance = axios.create({
	baseURL: import.meta.env.VITE_BACKEND_MAIN || "http://localhost:5001",
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
	},
});

mainApiClient.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		const token = getAccessToken();
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error: AxiosError) => {
		return Promise.reject(error);
	},
);

let isRefreshing = false;
let failedQueue: Array<{
	resolve: (value?: unknown) => void;
	reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null = null): void => {
	failedQueue.forEach((promise) => {
		if (error) {
			promise.reject(error);
		} else {
			promise.resolve();
		}
	});
	failedQueue = [];
};

mainApiClient.interceptors.response.use(
	(response: AxiosResponse) => response,
	(error: AxiosError) => {
		const originalRequest = error.config as InternalAxiosRequestConfig & {
			_retry?: boolean;
		};

		if (error.response?.status === 401 && !originalRequest._retry) {
			if (isRefreshing) {
				return new Promise((resolve, reject) => {
					failedQueue.push({ resolve, reject });
				})
					.then(() => {
						return mainApiClient(originalRequest);
					})
					.catch((err) => {
						return Promise.reject(err);
					});
			}

			originalRequest._retry = true;
			isRefreshing = true;

			const refreshToken = getRefreshToken();

			if (!refreshToken) {
				clearTokens();
				processQueue(new Error("No refresh token available"));
				isRefreshing = false;
				window.dispatchEvent(new CustomEvent("auth:logout"));

				const apiError: ApiError = {
					error: "Authentication failed",
					message: "Please log in again",
					status: 401,
				};
				return Promise.reject(apiError);
			}

			return axios
				.post(
					`${import.meta.env.VITE_BACKEND_MAIN || "http://localhost:5001"}/api/auth/refresh`,
					{ refresh_token: refreshToken },
				)
				.then((response) => {
					const { access_token, refresh_token: new_refresh_token } =
						response.data;

					setTokens(access_token, new_refresh_token);
					originalRequest.headers.Authorization = `Bearer ${access_token}`;

					processQueue();
					isRefreshing = false;

					return mainApiClient(originalRequest);
				})
				.catch((refreshError) => {
					logger.error("Token refresh failed", refreshError);
					processQueue(refreshError as Error);
					isRefreshing = false;
					clearTokens();
					window.dispatchEvent(new CustomEvent("auth:logout"));

					const apiError: ApiError = {
						error: "Token refresh failed",
						message: "Please log in again",
						status: 401,
					};
					return Promise.reject(apiError);
				});
		}

		const apiError: ApiError = {
			error: error.message,
			message: error.response?.data
				? typeof error.response.data === "object" &&
					"error" in error.response.data
					? String(error.response.data.error)
					: String(error.response.data)
				: error.message,
			status: error.response?.status,
		};

		logger.error("API request failed", {
			url: error.config?.url,
			method: error.config?.method,
			status: apiError.status,
			message: apiError.message,
		});

		return Promise.reject(apiError);
	},
);
