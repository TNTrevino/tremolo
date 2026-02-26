import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/api/auth.service";
import type {
	LoginRequest,
	RegisterRequest,
	User as ApiUser,
} from "@/services/api/types";

interface User {
	id: number;
	email: string;
	firstName: string;
	lastName: string;
	role: "STUDENT" | "TEACHER" | "PARENT";
}

// Helper to convert API user to local user format
const mapApiUserToUser = (apiUser: ApiUser): User => ({
	id: apiUser.id,
	email: apiUser.email,
	firstName: apiUser.first_name,
	lastName: apiUser.last_name,
	role: apiUser.role,
});

// Query Keys
export const authKeys = {
	all: ["auth"] as const,
	currentUser: () => [...authKeys.all, "current-user"] as const,
	login: () => [...authKeys.all, "login"] as const,
	register: () => [...authKeys.all, "register"] as const,
};

/**
 * Hook to get current user information
 * Only runs if user is authenticated
 */
export function useCurrentUser() {
	const token = useAuthStore((state) => state.token);

	return useQuery({
		queryKey: [...authKeys.currentUser(), token],
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
 * Hook to handle user login
 */
export function useLogin() {
	const queryClient = useQueryClient();
	const loginUser = useAuthStore((state) => state.loginUser);

	return useMutation({
		mutationFn: async (credentials: LoginRequest) => {
			await loginUser(credentials);
			const user = useAuthStore.getState().user;
			return user;
		},
		onSuccess: (user) => {
			if (user) {
				queryClient.setQueryData(authKeys.currentUser(), user);
			}
		},
	});
}

/**
 * Hook to handle user registration
 */
export function useRegister() {
	const registerUser = useAuthStore((state) => state.registerUser);

	return useMutation({
		mutationFn: async (userData: RegisterRequest) => {
			await registerUser(userData);
		},
	});
}

/**
 * Hook to handle user logout
 */
export function useLogout() {
	const queryClient = useQueryClient();
	const logoutUser = useAuthStore((state) => state.logoutUser);

	return useMutation({
		mutationFn: async () => {
			logoutUser();
		},
		onSuccess: () => {
			queryClient.clear();
		},
	});
}
