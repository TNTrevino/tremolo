import { formatDate, formatShortDate } from "./date.utils";

/**
 * The React app had no spec for these two, but both are now on user-visible
 * copy in the classes feature ("Joined Jul 12, 2026", "· Due …") and both
 * have a falsy-return contract the templates rely on to skip a separator.
 */
describe("formatDate", () => {
	it("returns an empty string for a missing date", () => {
		expect(formatDate(null)).toBe("");
		expect(formatDate(undefined)).toBe("");
		expect(formatDate("")).toBe("");
	});

	it("returns an empty string for an unparseable date", () => {
		expect(formatDate("not-a-date")).toBe("");
	});

	it("formats an ISO timestamp with a short month and a year", () => {
		// Midday UTC so the assertion does not depend on the runner's timezone.
		expect(formatDate("2026-07-12T12:00:00Z")).toMatch(/Jul.*12.*2026/);
	});
});

describe("formatShortDate", () => {
	it("returns an empty string for a missing date", () => {
		expect(formatShortDate(null)).toBe("");
		expect(formatShortDate("")).toBe("");
	});

	it("returns the raw input when it cannot be parsed", () => {
		expect(formatShortDate("nonsense")).toBe("nonsense");
	});

	it("drops the year", () => {
		expect(formatShortDate("2026-07-12")).toMatch(/Jul.*12/);
		expect(formatShortDate("2026-07-12")).not.toContain("2026");
	});

	it("parses at local midnight so the day never slips backwards", () => {
		// The bug this guards: `new Date("2026-01-01")` is UTC midnight, which
		// is 31 December in every negative-offset timezone.
		expect(formatShortDate("2026-01-01")).toMatch(/Jan.*1\b/);
	});
});
