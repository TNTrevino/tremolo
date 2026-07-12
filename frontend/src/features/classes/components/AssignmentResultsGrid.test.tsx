import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@/test/test-utils";
import { AssignmentResultsGrid } from "./AssignmentResultsGrid";
import type {
	Assignment,
	AssignmentResult,
	Attempt,
} from "@/features/classes/types";

const mockUseAssignmentResults = vi.fn();
const mockUseAssignmentAttempts = vi.fn();

vi.mock("@/shared/hooks/queries", () => ({
	useAssignmentResults: () => mockUseAssignmentResults(),
	useAssignmentAttempts: () => mockUseAssignmentAttempts(),
}));

const assignment: Assignment = {
	id: 3,
	classId: 1,
	title: "Week 1: Treble Notes",
	gameType: "note",
	config: {},
	dueAt: null,
	targetQuestions: null,
	targetAccuracy: null,
	createdAt: "2026-07-12T04:10:00Z",
};

const rows: AssignmentResult[] = [
	{
		studentId: 42,
		firstName: "Sam",
		lastName: "Student",
		attemptCount: 2,
		bestCorrect: 15,
		mostQuestions: 20,
		bestAccuracy: 75,
		lastAttemptDate: "2026-07-12",
	},
	{
		studentId: 43,
		firstName: "Riley",
		lastName: "Rookie",
		attemptCount: 0,
		bestCorrect: 0,
		mostQuestions: 0,
		bestAccuracy: 0,
		lastAttemptDate: "",
	},
];

const attempts: Attempt[] = [
	{
		correctQuestions: 13,
		totalQuestions: 14,
		accuracy: 92,
		notesPerMinute: 80,
		attemptedDate: "2026-07-12",
	},
];

describe("AssignmentResultsGrid", () => {
	beforeEach(() => {
		mockUseAssignmentResults.mockReset();
		mockUseAssignmentAttempts.mockReset();
		mockUseAssignmentAttempts.mockReturnValue({
			data: attempts,
			isLoading: false,
			isError: false,
			error: null,
		});
	});

	it("renders a populated row and a muted zero-attempt row", () => {
		mockUseAssignmentResults.mockReturnValue({
			data: rows,
			isLoading: false,
			isError: false,
			error: null,
		});

		render(<AssignmentResultsGrid assignment={assignment} />);

		// Populated row shows its stats (75% appears on the row and in the
		// class-average insight tile, since the one attempt is 75%).
		expect(screen.getByText("Sam Student")).toBeInTheDocument();
		expect(screen.getAllByText("75%").length).toBeGreaterThan(0);
		expect(screen.getByText("2026-07-12")).toBeInTheDocument();

		// Zero-attempt student appears but is marked "Not started" (the label
		// also appears once more as the insight tile's caption).
		expect(screen.getByText("Riley Rookie")).toBeInTheDocument();
		expect(screen.getAllByText("Not started").length).toBeGreaterThan(0);
	});

	it("shows the loading state", () => {
		mockUseAssignmentResults.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			error: null,
		});

		render(<AssignmentResultsGrid assignment={assignment} />);

		expect(screen.queryByText("Not started")).not.toBeInTheDocument();
	});

	it("expands a student row to show the attempt drill-down on click", async () => {
		const user = userEvent.setup();
		mockUseAssignmentResults.mockReturnValue({
			data: rows,
			isLoading: false,
			isError: false,
			error: null,
		});

		render(<AssignmentResultsGrid assignment={assignment} />);

		// Drill-down is not rendered until the row is expanded.
		expect(screen.queryByText(/npm/)).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /Sam Student/ }));

		expect(screen.getByText(/80 npm/)).toBeInTheDocument();
	});

	it("does not render a not-started row as a clickable button", () => {
		mockUseAssignmentResults.mockReturnValue({
			data: rows,
			isLoading: false,
			isError: false,
			error: null,
		});

		render(<AssignmentResultsGrid assignment={assignment} />);

		expect(
			screen.queryByRole("button", { name: /Riley Rookie/ }),
		).not.toBeInTheDocument();
	});

	it("shows the class insight tiles computed from the results", () => {
		mockUseAssignmentResults.mockReturnValue({
			data: rows,
			isLoading: false,
			isError: false,
			error: null,
		});

		render(<AssignmentResultsGrid assignment={assignment} />);

		// One of two enrolled students attempted, with a best accuracy of 75%
		// (shown both on the row and as the class average tile).
		expect(screen.getAllByText("75%")).toHaveLength(2);
		expect(screen.getByText("1 of 2")).toBeInTheDocument();
	});
});
