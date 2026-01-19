import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { ProtectedRoute } from "./ProtectedRoute";

// Mock the auth store
const mockAuthStore = {
	isAuthenticated: false,
};

vi.mock("@/stores/auth.store", () => ({
	useAuthStore: (selector: (state: typeof mockAuthStore) => boolean) =>
		selector(mockAuthStore),
}));

// Mock react-router-dom Navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		Navigate: ({ to, state }: { to: string; state?: object }) => {
			mockNavigate(to, state);
			return <div data-testid="navigate-mock">Redirecting to {to}</div>;
		},
	};
});

describe("ProtectedRoute", () => {
	beforeEach(() => {
		mockAuthStore.isAuthenticated = false;
		mockNavigate.mockClear();
	});

	describe("when user is not authenticated", () => {
		it("redirects to login page", () => {
			render(
				<ProtectedRoute>
					<div>Protected Content</div>
				</ProtectedRoute>,
			);

			expect(screen.getByTestId("navigate-mock")).toBeInTheDocument();
			expect(screen.getByText(/Redirecting to \/login/)).toBeInTheDocument();
		});

		it("does not render children", () => {
			render(
				<ProtectedRoute>
					<div data-testid="protected-content">Protected Content</div>
				</ProtectedRoute>,
			);

			expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
		});

		it("passes the current location in state for redirect back", () => {
			render(
				<ProtectedRoute>
					<div>Protected Content</div>
				</ProtectedRoute>,
			);

			expect(mockNavigate).toHaveBeenCalledWith(
				"/login",
				expect.objectContaining({
					from: expect.any(Object),
				}),
			);
		});
	});

	describe("when user is authenticated", () => {
		beforeEach(() => {
			mockAuthStore.isAuthenticated = true;
		});

		it("renders children", () => {
			render(
				<ProtectedRoute>
					<div data-testid="protected-content">Protected Content</div>
				</ProtectedRoute>,
			);

			expect(screen.getByTestId("protected-content")).toBeInTheDocument();
			expect(screen.getByText("Protected Content")).toBeInTheDocument();
		});

		it("does not redirect", () => {
			render(
				<ProtectedRoute>
					<div>Protected Content</div>
				</ProtectedRoute>,
			);

			expect(screen.queryByTestId("navigate-mock")).not.toBeInTheDocument();
		});

		it("renders complex children correctly", () => {
			render(
				<ProtectedRoute>
					<div data-testid="parent">
						<h1>Dashboard</h1>
						<p>Welcome back!</p>
						<button>Click me</button>
					</div>
				</ProtectedRoute>,
			);

			expect(screen.getByTestId("parent")).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { name: "Dashboard" }),
			).toBeInTheDocument();
			expect(screen.getByText("Welcome back!")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Click me" }),
			).toBeInTheDocument();
		});
	});
});
