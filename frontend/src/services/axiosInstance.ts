import axios, { AxiosResponse, InternalAxiosRequestConfig } from "axios";

const baseUrl = import.meta.env.VITE_BACKEND_MAIN;

// both are jwt tokens, so we cant call it like we do at respec
// basically acess token is the stock jwt token, and we use the refresh token
// when that is expired. If the refresh token is expired (like 7 weeks old)
// we log the user out so they can log in again
// TODO: give user a warning before getting logged out
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

// give this a retry prop to try the refresh token
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
	_retried?: boolean;
}

export const apiClient = axios.create({
	baseURL: baseUrl,
	validateStatus: () => true, // this stops the interceptor from throwing errors. We will handle them manually
});

/** Try to refresh access token using refresh token, returns
 *  [newAccessToken, error] */
async function attemptTokenRefresh(): Promise<[string | null, Error | null]> {
	const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
	if (!refreshToken) {
		return [null, new Error("No refresh token available")];
	}

	const refreshResponse = await axios.post<{ access_token: string }>(
		`${baseUrl}/api/auth/refresh`,
		{ refresh_token: refreshToken },
		{ validateStatus: () => true },
	);

	if (refreshResponse.status >= 200 && refreshResponse.status < 300) {
		const newAccessToken = refreshResponse.data.access_token;
		localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
		return [newAccessToken, null];
	} else {
		return [null, new Error("Session expired. Please login again.")];
	}
}

export const isOk = (response: AxiosResponse): boolean => {
	return response.status >= 200 && response.status < 300;
};

// Request interceptor: Automatically attach Authorization header if user is logged in
apiClient.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem(ACCESS_TOKEN_KEY);
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

// Response interceptor: Automatic token refresh on 401's
apiClient.interceptors.response.use(
	async (response) => {
		const originalRequest = response.config as RetryableRequestConfig;

		// try to refresh if the response was 401 and we haven't retried yet
		if (response.status === 401 && !originalRequest._retried) {
			originalRequest._retried = true;

			const [newAccessToken, error] = await attemptTokenRefresh();

			if (error) {
				// CASE: refresh failed - clear tokens and return 401 response
				localStorage.removeItem(ACCESS_TOKEN_KEY);
				localStorage.removeItem(REFRESH_TOKEN_KEY);
				// TODO: toast notification "Session expired. Please login again."
				return response;
			}

			// CASE: refresh successful - retry original request with new token
			originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
			return apiClient(originalRequest); // try again with recursion
		}

		return response;
	},
	(error) => {
		return Promise.reject(error); // only network errors, not 400 http statuses
	},
);
