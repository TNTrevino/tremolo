import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { MyClassesView } from "./MyClassesView";
import type { Class } from "@/features/classes/types";

const mockUseTeacherClasses = vi.fn();
const mockCreateClassMutate = vi.fn();

vi.mock("@/shared/hooks/queries", () => ({
	useTeacherClasses: () => mockUseTeacherClasses(),
	useCreateClass: () => ({
		mutate: mockCreateClassMutate,
		isPending: false,
	}),
}));

const sampleClasses: Class[] = [
	{
		id: 1,
		name: "Symphonic Band",
		joinCode: "7NZJN3",
		studentCount: 12,
		createdAt: "2026-07-12T04:00:00Z",
	},
	{
		id: 2,
		name: "Jazz Ensemble",
		joinCode: "AB12CD",
		studentCount: 4,
		createdAt: "2026-07-11T04:00:00Z",
	},
];

describe("MyClassesView", () => {
	beforeEach(() => {
		mockUseTeacherClasses.mockReset();
		mockCreateClassMutate.mockReset();
	});

	it("shows loading skeletons while fetching", () => {
		mockUseTeacherClasses.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			error: null,
		});

		render(<MyClassesView />);

		expect(screen.getByText("My Classes")).toBeInTheDocument();
		expect(screen.queryByText(/no classes yet/i)).not.toBeInTheDocument();
	});

	it("shows an error state", () => {
		mockUseTeacherClasses.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: new Error("Network error"),
		});

		render(<MyClassesView />);

		expect(screen.getByText("Network error")).toBeInTheDocument();
	});

	it("shows the empty state when there are no classes", () => {
		mockUseTeacherClasses.mockReturnValue({
			data: [],
			isLoading: false,
			isError: false,
			error: null,
		});

		render(<MyClassesView />);

		expect(
			screen.getByText("No classes yet — create one to get started."),
		).toBeInTheDocument();
	});

	it("renders a card per class with the join code and student count", () => {
		mockUseTeacherClasses.mockReturnValue({
			data: sampleClasses,
			isLoading: false,
			isError: false,
			error: null,
		});

		render(<MyClassesView />);

		expect(screen.getByText("Symphonic Band")).toBeInTheDocument();
		expect(screen.getByText("7NZJN3")).toBeInTheDocument();
		expect(screen.getByText("12")).toBeInTheDocument();
		expect(screen.getByText("Jazz Ensemble")).toBeInTheDocument();
		expect(screen.getByText("AB12CD")).toBeInTheDocument();
	});

	it("opens the create-class dialog from the New class CTA", async () => {
		mockUseTeacherClasses.mockReturnValue({
			data: [],
			isLoading: false,
			isError: false,
			error: null,
		});
		const { default: userEvent } = await import("@testing-library/user-event");
		const user = userEvent.setup();

		render(<MyClassesView />);

		await user.click(screen.getByRole("button", { name: /new class/i }));

		const dialog = screen.getByRole("dialog");
		expect(dialog).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /new class/i }),
		).toBeInTheDocument();
	});
});
