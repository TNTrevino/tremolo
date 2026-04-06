import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/api";
import type { LoginRequest, RegisterRequest, User } from "@/services/api/types";
import { mapApiUserToUser } from "@/services/api/mappers/user.mapper";

export const authKeys = {
	all: ["auth"] as const,
	currentUser: () => [...authKeys.all, "current-user"] as const,
	login: () => [...authKeys.all, "login"] as const,
	register: () => [...authKeys.all, "register"] as const,
};

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
		onSuccess: (response) => {
			useAuthStore.getState().setAuthFromLoginResponse(response);
			const user = mapApiUserToUser(response.user);
			queryClient.setQueryData(authKeys.currentUser(), user);
		},
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
