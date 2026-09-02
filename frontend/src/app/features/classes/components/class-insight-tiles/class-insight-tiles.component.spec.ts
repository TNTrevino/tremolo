import type { AssignmentResult } from "../../models/classes.models";
import { computeClassInsightStats } from "./class-insight-tiles.component";

/**
 * Port of
 * frontend-react/src/features/classes/components/ClassInsightTiles.test.tsx,
 * case for case. The arithmetic is the whole contract: a class average that
 * silently included the students who never attempted would read low and
 * mean nothing.
 */
function makeResult(overrides: Partial<AssignmentResult>): AssignmentResult {
	return {
		studentId: 1,
		firstName: "Sam",
		lastName: "Student",
		attemptCount: 0,
		bestCorrect: 0,
		mostQuestions: 0,
		bestAccuracy: 0,
		lastAttemptDate: "",
		...overrides,
	};
}

describe("computeClassInsightStats", () => {
	it("averages best accuracy across only students who attempted", () => {
		const stats = computeClassInsightStats([
			makeResult({ studentId: 1, attemptCount: 1, bestAccuracy: 80 }),
			makeResult({ studentId: 2, attemptCount: 1, bestAccuracy: 60 }),
			makeResult({ studentId: 3, attemptCount: 0, bestAccuracy: 0 }),
		]);

		expect(stats.averageAccuracy).toBe(70);
		expect(stats.attemptedCount).toBe(2);
		expect(stats.totalCount).toBe(3);
		expect(stats.notStartedCount).toBe(1);
	});

	it("returns null average and zero counts for an empty roster", () => {
		const stats = computeClassInsightStats([]);

		expect(stats.averageAccuracy).toBeNull();
		expect(stats.attemptedCount).toBe(0);
		expect(stats.totalCount).toBe(0);
		expect(stats.notStartedCount).toBe(0);
	});

	it("returns null average when nobody has attempted yet", () => {
		const stats = computeClassInsightStats([
			makeResult({ studentId: 1 }),
			makeResult({ studentId: 2 }),
		]);

		expect(stats.averageAccuracy).toBeNull();
		expect(stats.attemptedCount).toBe(0);
		expect(stats.notStartedCount).toBe(2);
	});

	it("rounds the average accuracy", () => {
		const stats = computeClassInsightStats([
			makeResult({ studentId: 1, attemptCount: 1, bestAccuracy: 70 }),
			makeResult({ studentId: 2, attemptCount: 1, bestAccuracy: 71 }),
			makeResult({ studentId: 3, attemptCount: 1, bestAccuracy: 71 }),
		]);

		expect(stats.averageAccuracy).toBe(71);
	});
});
