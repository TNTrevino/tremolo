import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import type { StudentAssignment } from "../../models/classes.models";
import {
	AssignmentCardComponent,
	hasMetTarget,
} from "./assignment-card.component";

/**
 * Port of
 * frontend-react/src/features/classes/components/AssignmentCard.test.tsx.
 *
 * The progress line and the Practice link are both parity-suite contracts:
 * `classes.spec.ts` reads "No attempts yet" / "1 attempt" off this card and
 * clicks the CTA to reach `/assignments/:id/play`.
 */
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

describe("AssignmentCardComponent", () => {
	let fixture: ComponentFixture<AssignmentCardComponent>;

	async function render(
		overrides: Partial<StudentAssignment> = {},
	): Promise<HTMLElement> {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
		fixture = TestBed.createComponent(AssignmentCardComponent);
		fixture.componentRef.setInput("assignment", makeAssignment(overrides));
		await fixture.whenStable();
		return fixture.nativeElement as HTMLElement;
	}

	it("renders title, class name, and progress", async () => {
		const el = await render();

		expect(el.textContent).toContain("Week 1: Treble Notes");
		expect(el.textContent).toContain("Symphonic Band");
		expect(el.textContent).toContain("15 correct");
		expect(el.textContent).toContain("75% accuracy");
	});

	it("says so when there are no attempts", async () => {
		const el = await render({ attemptCount: 0 });

		expect(el.textContent).toContain("No attempts yet");
	});

	it("keeps 'attempt' singular for exactly one", async () => {
		const el = await render({ attemptCount: 1 });

		expect(el.textContent).toContain("1 attempt ·");
	});

	it("omits the due date when null", async () => {
		const el = await render({ dueAt: null });

		expect(el.textContent).not.toContain("Due");
	});

	it("shows a formatted due date when present", async () => {
		const el = await render({ dueAt: "2026-07-20T12:00:00Z" });

		expect(el.textContent).toContain("Due Jul");
	});

	it("shows a target-met badge in the feedback colour when met", async () => {
		const el = await render({ bestAccuracy: 85, targetAccuracy: 80 });
		const badge = [...el.querySelectorAll("span")].find(
			(s) => s.textContent?.trim() === "Target met",
		);

		expect(badge).toBeTruthy();
		expect(badge?.className).toContain("text-correct");
	});

	it("shows the target value when not yet met", async () => {
		const el = await render({ bestAccuracy: 60, targetAccuracy: 80 });

		expect(el.textContent).toContain("Target 80%");
	});

	it("does not show a badge when there is no target", async () => {
		const el = await render({ targetAccuracy: null });

		expect(el.textContent).not.toContain("Target");
	});

	it("links the Practice CTA to the assignment play route", async () => {
		const el = await render({ id: 42 });
		const link = el.querySelector("a") as HTMLAnchorElement;

		expect(link.getAttribute("href")).toBe("/assignments/42/play");
		expect(link.textContent).toContain("Practice");
	});
});
