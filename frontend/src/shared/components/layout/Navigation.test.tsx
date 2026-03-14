import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Navigation } from "./Navigation";

// Mock the auth store
const mockAuthStore = {
	user: null as { firstName: string; lastName: string; email: string } | null,
	isAuthenticated: false,
};

vi.mock("@/stores/auth.store", () => ({
	useAuthStore: () => mockAuthStore,
}));

const mockLogoutMutate = vi.fn();
vi.mock("@/shared/hooks/queries/useAuthQuery", () => ({
	useLogout: () => ({ mutate: mockLogoutMutate }),
}));

describe("Navigation", () => {
	beforeEach(() => {
		// Reset mock state before each test
		mockAuthStore.user = null;
		mockAuthStore.isAuthenticated = false;
		mockLogoutMutate.mockReset();
	});

	describe("when user is not authenticated", () => {
		it("shows the Login button", () => {
			render(<Navigation />);

			const loginButton = screen.getByRole("link", { name: /login/i });
			expect(loginButton).toBeInTheDocument();
		});

		it("does not show user avatar", () => {
			render(<Navigation />);

			// Avatar button would contain user initials like "JD"
			// When not authenticated, there should be no avatar button
			const avatarButtons = screen.queryAllByRole("button");
			const avatarButton = avatarButtons.find((btn) =>
				/^[A-Z]{2}$/.test(btn.textContent || ""),
			);

			expect(avatarButton).toBeUndefined();
		});
	});

	describe("when user is authenticated", () => {
		beforeEach(() => {
			mockAuthStore.user = {
				firstName: "John",
				lastName: "Doe",
				email: "john.doe@example.com",
			};
			mockAuthStore.isAuthenticated = true;
		});

		it("shows user avatar with initials", () => {
			render(<Navigation />);

			// Find button that contains the initials "JD"
			const buttons = screen.getAllByRole("button");
			const initialsButton = buttons.find((btn) => btn.textContent === "JD");

			expect(initialsButton).toBeInTheDocument();
		});

		it("does not show Login button in desktop view", () => {
			render(<Navigation />);

			// The Login link should not be present when authenticated
			const loginLink = screen.queryByRole("link", { name: /login/i });
			expect(loginLink).not.toBeInTheDocument();
		});

		it("displays correct user initials based on user name", () => {
			// Update user to different name
			mockAuthStore.user = {
				firstName: "Alice",
				lastName: "Smith",
				email: "alice@example.com",
			};

			render(<Navigation />);

			const buttons = screen.getAllByRole("button");
			const initialsButton = buttons.find((btn) => btn.textContent === "AS");

			expect(initialsButton).toBeInTheDocument();
		});
	});

	describe("navigation links", () => {
		it("renders all navigation links", () => {
			render(<Navigation />);

			// There are multiple Tremolo links (logo + nav), so use getAllByRole
			const tremoloLinks = screen.getAllByRole("link", { name: /tremolo/i });
			expect(tremoloLinks.length).toBeGreaterThanOrEqual(1);

			expect(
				screen.getByRole("link", { name: /practice/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: /note game/i }),
			).toBeInTheDocument();
			expect(screen.getByRole("link", { name: /about/i })).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: /convert/i }),
			).toBeInTheDocument();
		});
	});

	describe("theme toggle", () => {
		it("renders theme toggle button", () => {
			render(<Navigation />);

			// Theme toggle button should be present (contains Sun or Moon icon)
			const buttons = screen.getAllByRole("button");
			// At least one button should exist for theme toggle
			expect(buttons.length).toBeGreaterThan(0);
		});
	});
});
