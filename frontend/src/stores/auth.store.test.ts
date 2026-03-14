import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./auth.store";

describe("auth.store", () => {
	beforeEach(() => {
		useAuthStore.setState({
			user: null,
			token: null,
			isAuthenticated: false,
		});
	});

	describe("initial state", () => {
		it("starts with null user", () => {
			const state = useAuthStore.getState();
			expect(state.user).toBeNull();
		});

		it("starts with null token", () => {
			const state = useAuthStore.getState();
			expect(state.token).toBeNull();
		});

		it("starts as not authenticated", () => {
			const state = useAuthStore.getState();
			expect(state.isAuthenticated).toBe(false);
		});
	});

	describe("setUser", () => {
		it("sets the user", () => {
			const user = {
				id: 1,
				email: "test@example.com",
				firstName: "John",
				lastName: "Doe",
				role: "STUDENT" as const,
			};

			useAuthStore.getState().setUser(user);

			expect(useAuthStore.getState().user).toEqual(user);
		});
	});

	describe("setToken", () => {
		it("sets the token", () => {
			useAuthStore.getState().setToken("test-token");

			expect(useAuthStore.getState().token).toBe("test-token");
		});

		it("sets isAuthenticated to true when token is set", () => {
			useAuthStore.getState().setToken("test-token");

			expect(useAuthStore.getState().isAuthenticated).toBe(true);
		});

		it("sets isAuthenticated to false when token is empty", () => {
			useAuthStore.getState().setToken("test-token");
			useAuthStore.getState().setToken("");

			expect(useAuthStore.getState().isAuthenticated).toBe(false);
		});
	});

	describe("setAuthFromLoginResponse", () => {
		it("maps API user and sets user, token, and isAuthenticated", () => {
			const loginResponse = {
				user: {
					id: 1,
					email: "test@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "STUDENT" as const,
				},
				access_token: "access-token",
				refresh_token: "refresh-token",
			};

			useAuthStore.getState().setAuthFromLoginResponse(loginResponse);

			const state = useAuthStore.getState();
			expect(state.user).toEqual({
				id: 1,
				email: "test@example.com",
				firstName: "John",
				lastName: "Doe",
				role: "STUDENT",
			});
			expect(state.token).toBe("access-token");
			expect(state.isAuthenticated).toBe(true);
		});
	});

	describe("clearAuth", () => {
		it("clears user on clearAuth", () => {
			useAuthStore.setState({
				user: {
					id: 1,
					email: "test@example.com",
					firstName: "John",
					lastName: "Doe",
					role: "STUDENT" as const,
				},
				token: "test-token",
				isAuthenticated: true,
			});

			useAuthStore.getState().clearAuth();

			expect(useAuthStore.getState().user).toBeNull();
		});

		it("clears token on clearAuth", () => {
			useAuthStore.setState({
				user: null,
				token: "test-token",
				isAuthenticated: true,
			});

			useAuthStore.getState().clearAuth();

			expect(useAuthStore.getState().token).toBeNull();
		});

		it("sets isAuthenticated to false on clearAuth", () => {
			useAuthStore.setState({
				user: null,
				token: "test-token",
				isAuthenticated: true,
			});

			useAuthStore.getState().clearAuth();

			expect(useAuthStore.getState().isAuthenticated).toBe(false);
		});
	});
});
