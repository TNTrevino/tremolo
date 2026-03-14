import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LoginResponse, User } from "@/services/api/types";
import { mapApiUserToUser } from "@/services/api/mappers/user.mapper";

interface AuthState {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	setUser: (user: User) => void;
	setToken: (token: string) => void;
	setAuthFromLoginResponse: (response: LoginResponse) => void;
	clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			user: null,
			token: null,
			isAuthenticated: false,
			setUser: (user) => set({ user }),
			setToken: (token) => set({ token, isAuthenticated: !!token }),
			setAuthFromLoginResponse: (response) => {
				const user = mapApiUserToUser(response.user);
				set({ user, token: response.access_token, isAuthenticated: true });
			},
			clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
		}),
		{ name: "tremolo-auth" },
	),
);

// Listen for auth:logout events from the API client
if (typeof window !== "undefined") {
	window.addEventListener("auth:logout", () => {
		useAuthStore.getState().clearAuth();
	});
}
