import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore } from "./auth.store";

// Mock the auth service
vi.mock("@/services/api/auth.service", () => ({
	authService: {
		login: vi.fn(),
		register: vi.fn(),
		logout: vi.fn(),
	},
}));

describe("auth.store", () => {
	beforeEach(() => {
		// Reset store state before each test
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

	describe("logout", () => {
		it("clears user on logout", () => {
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

			useAuthStore.getState().logout();

			expect(useAuthStore.getState().user).toBeNull();
		});

		it("clears token on logout", () => {
			useAuthStore.setState({
				user: null,
				token: "test-token",
				isAuthenticated: true,
			});

			useAuthStore.getState().logout();

			expect(useAuthStore.getState().token).toBeNull();
		});

		it("sets isAuthenticated to false on logout", () => {
			useAuthStore.setState({
				user: null,
				token: "test-token",
				isAuthenticated: true,
			});

			useAuthStore.getState().logout();

			expect(useAuthStore.getState().isAuthenticated).toBe(false);
		});
	});

	describe("logoutUser", () => {
		it("calls authService.logout and clears state", async () => {
			const { authService } = await import("@/services/api/auth.service");

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

			useAuthStore.getState().logoutUser();

			expect(authService.logout).toHaveBeenCalled();
			expect(useAuthStore.getState().user).toBeNull();
			expect(useAuthStore.getState().token).toBeNull();
			expect(useAuthStore.getState().isAuthenticated).toBe(false);
		});
	});

	describe("loginUser", () => {
		it("sets user and token on successful login", async () => {
			const { authService } = await import("@/services/api/auth.service");

			const mockResponse = {
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

			vi.mocked(authService.login).mockResolvedValue(mockResponse);

			await useAuthStore.getState().loginUser({
				email: "test@example.com",
				password: "password123",
			});

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

		it("throws error on failed login", async () => {
			const { authService } = await import("@/services/api/auth.service");

			vi.mocked(authService.login).mockRejectedValue(
				new Error("Invalid credentials"),
			);

			await expect(
				useAuthStore.getState().loginUser({
					email: "test@example.com",
					password: "wrong-password",
				}),
			).rejects.toThrow("Invalid credentials");
		});
	});

	describe("registerUser", () => {
		it("calls authService.register", async () => {
			const { authService } = await import("@/services/api/auth.service");

			vi.mocked(authService.register).mockResolvedValue({
				message: "User registered successfully",
				user: {
					id: 2,
					email: "new@example.com",
					first_name: "Jane",
					last_name: "Doe",
					role: "STUDENT",
				},
			});

			await useAuthStore.getState().registerUser({
				email: "new@example.com",
				password: "password123",
				first_name: "Jane",
				last_name: "Doe",
				role: "STUDENT",
			});

			expect(authService.register).toHaveBeenCalledWith({
				email: "new@example.com",
				password: "password123",
				first_name: "Jane",
				last_name: "Doe",
				role: "STUDENT",
			});
		});

		it("does not auto-login after registration", async () => {
			const { authService } = await import("@/services/api/auth.service");

			vi.mocked(authService.register).mockResolvedValue({
				message: "User registered successfully",
				user: {
					id: 2,
					email: "new@example.com",
					first_name: "Jane",
					last_name: "Doe",
					role: "STUDENT",
				},
			});

			await useAuthStore.getState().registerUser({
				email: "new@example.com",
				password: "password123",
				first_name: "Jane",
				last_name: "Doe",
				role: "STUDENT",
			});

			const state = useAuthStore.getState();
			expect(state.isAuthenticated).toBe(false);
			expect(state.user).toBeNull();
		});
	});
});
