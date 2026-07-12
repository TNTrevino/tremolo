import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { AssignmentCard, hasMetTarget } from "./AssignmentCard";
import type { StudentAssignment } from "@/features/classes/types";

function makeAssignment(
	overrides: Partial<StudentAssignment> = {},
): StudentAssignment {
	return {
		id: 3,
		classId: 1,
		title: "Week 1: Treble Notes",
		gameType: "note",
		config: {},
		dueAt: null,
		targetQuestions: null,
		targetAccuracy: null,
		createdAt: "2026-07-12T04:10:00Z",
		className: "Symphonic Band",
		attemptCount: 1,
		bestCorrect: 15,
		bestAccuracy: 75,
		...overrides,
	};
}

describe("hasMetTarget", () => {
	it("returns null when there is no target accuracy", () => {
		expect(hasMetTarget(makeAssignment({ targetAccuracy: null }))).toBeNull();
	});

	it("returns true when best accuracy meets the target", () => {
		expect(
			hasMetTarget(makeAssignment({ bestAccuracy: 80, targetAccuracy: 80 })),
		).toBe(true);
	});

	it("returns true when best accuracy exceeds the target", () => {
		expect(
			hasMetTarget(makeAssignment({ bestAccuracy: 90, targetAccuracy: 80 })),
		).toBe(true);
	});

	it("returns false when best accuracy is below the target", () => {
		expect(
			hasMetTarget(makeAssignment({ bestAccuracy: 70, targetAccuracy: 80 })),
		).toBe(false);
	});
});

describe("AssignmentCard", () => {
	it("renders title, class name, and progress", () => {
		render(<AssignmentCard assignment={makeAssignment()} />);

		expect(screen.getByText("Week 1: Treble Notes")).toBeInTheDocument();
		expect(screen.getByText(/Symphonic Band/)).toBeInTheDocument();
		expect(screen.getByText(/15 correct/)).toBeInTheDocument();
		expect(screen.getByText(/75% accuracy/)).toBeInTheDocument();
	});

	it("omits the due date when null", () => {
		render(<AssignmentCard assignment={makeAssignment({ dueAt: null })} />);

		expect(screen.queryByText(/Due/)).not.toBeInTheDocument();
	});

	it("shows a formatted due date when present", () => {
		render(
			<AssignmentCard
				assignment={makeAssignment({ dueAt: "2026-07-20T00:00:00Z" })}
			/>,
		);

		expect(screen.getByText(/Due Jul/)).toBeInTheDocument();
	});

	it("shows a target-met badge using the feedback color when met", () => {
		render(
			<AssignmentCard
				assignment={makeAssignment({ bestAccuracy: 85, targetAccuracy: 80 })}
			/>,
		);

		const badge = screen.getByText("Target met");
		expect(badge).toHaveClass("text-correct");
	});

	it("shows the target value when not yet met", () => {
		render(
			<AssignmentCard
				assignment={makeAssignment({ bestAccuracy: 60, targetAccuracy: 80 })}
			/>,
		);

		expect(screen.getByText("Target 80%")).toBeInTheDocument();
	});

	it("does not show a badge when there is no target", () => {
		render(
			<AssignmentCard assignment={makeAssignment({ targetAccuracy: null })} />,
		);

		expect(screen.queryByText(/Target/)).not.toBeInTheDocument();
	});

	it("links the Practice CTA to the assignment play route", () => {
		render(<AssignmentCard assignment={makeAssignment({ id: 42 })} />);

		expect(screen.getByRole("link", { name: /practice/i })).toHaveAttribute(
			"href",
			"/assignments/42/play",
		);
	});
});
