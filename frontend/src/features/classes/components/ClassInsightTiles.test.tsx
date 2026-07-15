import { describe, it, expect } from "vitest";
import { computeClassInsightStats } from "./ClassInsightTiles";
import type { AssignmentResult } from "@/features/classes/types";

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
		const results: AssignmentResult[] = [
			makeResult({ studentId: 1, attemptCount: 1, bestAccuracy: 80 }),
			makeResult({ studentId: 2, attemptCount: 1, bestAccuracy: 60 }),
			makeResult({ studentId: 3, attemptCount: 0, bestAccuracy: 0 }),
		];

		const stats = computeClassInsightStats(results);

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
		const results: AssignmentResult[] = [
			makeResult({ studentId: 1 }),
			makeResult({ studentId: 2 }),
		];

		const stats = computeClassInsightStats(results);

		expect(stats.averageAccuracy).toBeNull();
		expect(stats.attemptedCount).toBe(0);
		expect(stats.notStartedCount).toBe(2);
	});

	it("rounds the average accuracy", () => {
		const results: AssignmentResult[] = [
			makeResult({ studentId: 1, attemptCount: 1, bestAccuracy: 70 }),
			makeResult({ studentId: 2, attemptCount: 1, bestAccuracy: 71 }),
			makeResult({ studentId: 3, attemptCount: 1, bestAccuracy: 71 }),
		];

		const stats = computeClassInsightStats(results);

		expect(stats.averageAccuracy).toBe(71);
	});
});
