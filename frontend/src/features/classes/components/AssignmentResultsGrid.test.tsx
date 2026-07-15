import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { AssignmentResultsGrid } from "./AssignmentResultsGrid";
import type { Assignment, AssignmentResult } from "@/features/classes/types";

const mockUseAssignmentResults = vi.fn();

vi.mock("@/shared/hooks/queries", () => ({
	useAssignmentResults: () => mockUseAssignmentResults(),
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

describe("AssignmentResultsGrid", () => {
	beforeEach(() => {
		mockUseAssignmentResults.mockReset();
	});

	it("renders a populated row and a muted zero-attempt row", () => {
		mockUseAssignmentResults.mockReturnValue({
			data: rows,
			isLoading: false,
			isError: false,
			error: null,
		});

		render(<AssignmentResultsGrid assignment={assignment} />);

		// Populated row shows its stats.
		expect(screen.getByText("Sam Student")).toBeInTheDocument();
		expect(screen.getByText("75%")).toBeInTheDocument();
		expect(screen.getByText("2026-07-12")).toBeInTheDocument();

		// Zero-attempt student appears but is marked "Not started".
		expect(screen.getByText("Riley Rookie")).toBeInTheDocument();
		expect(screen.getByText("Not started")).toBeInTheDocument();
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
});
