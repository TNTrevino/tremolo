import { create } from "zustand";
import { persist } from "zustand/middleware";
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

interface AuthState {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	setUser: (user: User) => void;
	setToken: (token: string) => void;
	logout: () => void;
	loginUser: (credentials: LoginRequest) => Promise<void>;
	registerUser: (userData: RegisterRequest) => Promise<void>;
	logoutUser: () => void;
}

// Helper to convert API user to store user format
const mapApiUserToStoreUser = (apiUser: ApiUser): User => ({
	id: apiUser.id,
	email: apiUser.email,
	firstName: apiUser.first_name,
	lastName: apiUser.last_name,
	role: apiUser.role,
});

export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			user: null,
			token: null,
			isAuthenticated: false,
			setUser: (user) => set({ user }),
			setToken: (token) => set({ token, isAuthenticated: !!token }),

			loginUser: async (credentials: LoginRequest) => {
				const response = await authService.login(credentials);
				const user = mapApiUserToStoreUser(response.user);
				set({ user, token: response.access_token, isAuthenticated: true });
			},

			registerUser: async (userData: RegisterRequest) => {
				await authService.register(userData);
				// Note: Register doesn't auto-login, user must login separately
			},

			logoutUser: () => {
				authService.logout();
				set({ user: null, token: null, isAuthenticated: false });
			},

			logout: () => set({ user: null, token: null, isAuthenticated: false }),
		}),
		{ name: "tremolo-auth" },
	),
);

// Listen for auth:logout events from the API client
if (typeof window !== "undefined") {
	window.addEventListener("auth:logout", () => {
		useAuthStore.getState().logout();
	});
}
