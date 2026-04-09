import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/api";
import type {
	LoginRequest,
	LoginResponse,
	RegisterRequest,
	User,
	GoogleCallbackRequest,
} from "@/services/api/types";
import { mapApiUserToUser } from "@/services/api/mappers/user.mapper";

export const authKeys = {
	all: ["auth"] as const,
	currentUser: () => [...authKeys.all, "current-user"] as const,
	login: () => [...authKeys.all, "login"] as const,
	register: () => [...authKeys.all, "register"] as const,
};

/**
 * Shared handler for successful login responses (used by both useLogin and useGoogleCallback).
 * Updates auth store and query cache with the authenticated user.
 */
function handleLoginSuccess(
	response: LoginResponse,
	queryClient: ReturnType<typeof useQueryClient>,
): void {
	useAuthStore.getState().setAuthFromLoginResponse(response);
	const user = mapApiUserToUser(response.user);
	queryClient.setQueryData(authKeys.currentUser(), user);
}

/**
 * Hook to get current user information.
 * Only runs if user is authenticated.
 */
export function useCurrentUser() {
	const token = useAuthStore((state) => state.token);

	return useQuery({
		queryKey: [...authKeys.currentUser(), token],
		meta: { errorTitle: "Failed to load account" },
		queryFn: async (): Promise<User> => {
			if (!token) {
				throw new Error("No authentication token found");
			}

			const apiUser = await authService.getCurrentUser();
			return mapApiUserToUser(apiUser);
		},
		enabled: !!token,
	});
}

/**
 * Hook to handle user login.
 * Calls authService directly, then updates Zustand on success.
 */
export function useLogin() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (credentials: LoginRequest) => authService.login(credentials),
		meta: { suppressErrorToast: true },
		onSuccess: (response) => handleLoginSuccess(response, queryClient),
	});
}

/**
 * Hook to handle user registration.
 * Calls authService directly; does not auto-login.
 */
export function useRegister() {
	return useMutation({
		mutationFn: (userData: RegisterRequest) => authService.register(userData),
		meta: { suppressErrorToast: true },
	});
}

/**
 * Hook to handle user logout.
 * Calls authService directly, then clears Zustand and query cache.
 */
export function useLogout() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			await authService.logout();
		},
		meta: { errorTitle: "Sign out failed" },
		onSuccess: () => {
			useAuthStore.getState().clearAuth();
			queryClient.clear();
		},
	});
}

/**
 * Hook to handle Google OAuth callback.
 * Exchanges the authorization code for tokens and logs the user in.
 */
export function useGoogleCallback() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (request: GoogleCallbackRequest) =>
			authService.googleCallback(request),
		meta: { suppressErrorToast: true },
		onSuccess: (response) => handleLoginSuccess(response, queryClient),
	});
}

/**
 * Hook to link a Google account to the current authenticated user.
 */
export function useLinkGoogle() {
	return useMutation({
		mutationFn: (request: GoogleCallbackRequest) =>
			authService.linkGoogle(request),
		meta: { errorTitle: "Failed to link Google account" },
	});
}
