/**
 * Music API Client
 *
 * Axios instance for the Django music generation backend (port 8000).
 * No authentication required - returns MusicXML content.
 */

import type { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import axios from "axios";
import type { ApiError } from "../types";

export const musicApiClient: AxiosInstance = axios.create({
	baseURL:
		(import.meta.env.VITE_BACKEND_MUSIC || "http://localhost:8000") + "/music",
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
	},
});

musicApiClient.interceptors.response.use(
	(response: AxiosResponse) => response,
	(error: AxiosError) => {
		const apiError: ApiError = {
			error: error.message,
			message: error.response?.data
				? String(error.response.data)
				: "Music generation failed",
			status: error.response?.status,
		};
		return Promise.reject(apiError);
	},
);
