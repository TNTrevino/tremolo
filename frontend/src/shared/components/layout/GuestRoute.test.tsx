import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { GuestRoute } from "./GuestRoute";

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
		Navigate: ({ to }: { to: string }) => {
			mockNavigate(to);
			return <div data-testid="navigate-mock">Redirecting to {to}</div>;
		},
	};
});

describe("GuestRoute", () => {
	beforeEach(() => {
		mockAuthStore.isAuthenticated = false;
		mockNavigate.mockClear();
	});

	describe("when user is not authenticated", () => {
		it("renders children", () => {
			render(
				<GuestRoute>
					<div data-testid="guest-content">Login Form</div>
				</GuestRoute>,
			);

			expect(screen.getByTestId("guest-content")).toBeInTheDocument();
			expect(screen.getByText("Login Form")).toBeInTheDocument();
		});

		it("does not redirect", () => {
			render(
				<GuestRoute>
					<div>Login Form</div>
				</GuestRoute>,
			);

			expect(screen.queryByTestId("navigate-mock")).not.toBeInTheDocument();
		});
	});

	describe("when user is authenticated", () => {
		beforeEach(() => {
			mockAuthStore.isAuthenticated = true;
		});

		it("redirects to dashboard", () => {
			render(
				<GuestRoute>
					<div>Login Form</div>
				</GuestRoute>,
			);

			expect(screen.getByTestId("navigate-mock")).toBeInTheDocument();
			expect(
				screen.getByText(/Redirecting to \/dashboard/),
			).toBeInTheDocument();
			expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
		});

		it("does not render children", () => {
			render(
				<GuestRoute>
					<div data-testid="guest-content">Login Form</div>
				</GuestRoute>,
			);

			expect(screen.queryByTestId("guest-content")).not.toBeInTheDocument();
		});
	});
});
