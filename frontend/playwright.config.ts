import { defineConfig, devices } from "@playwright/test";

/**
 * The parity harness (D15).
 *
 * One suite, two apps. `E2E_BASE_URL` is the only thing that changes
 * between running these specs against the React app and running them
 * against the Angular one -- which is the whole point: a spec that has to
 * be edited to pass on Angular is a behaviour change, and gets recorded as
 * a deviation rather than quietly fixed (PLAN.md, "Parity harness").
 *
 * Both backends must be up: Go on :5001, Python on :8000. The specs seed
 * their own users and classes through the Go API rather than through the
 * UI, so seeding never depends on which frontend is under test.
 */
const baseURL = process.env["E2E_BASE_URL"] ?? "http://localhost:4200";

/** Desktop and phone, the two viewports the baselines are captured at. */
export const VIEWPORTS = {
	desktop: { width: 1280, height: 800 },
	mobile: { width: 390, height: 844 },
} as const;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	forbidOnly: !!process.env["CI"],
	retries: process.env["CI"] ? 2 : 0,
	// Serial: the specs share one database, and the golden flows assert on
	// counts (attempts, friends, roster size) that concurrent runs would
	// race on. Parity is the goal here, not suite wall-clock.
	workers: 1,
	// A game spec plays ten questions at a deliberately human pace (see
	// ANSWER_INTERVAL_MS) on top of a login and a couple of navigations, so
	// Playwright's 30s default is not enough headroom.
	timeout: 90_000,
	reporter: process.env["CI"]
		? [["github"], ["html", { open: "never" }]]
		: [["list"]],

	use: {
		baseURL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},

	// Baselines live in the migration control directory, not next to the
	// specs: every phase's verifier diffs its delivered routes against them,
	// so they are migration state, not test fixtures.
	snapshotPathTemplate: ".migration/baselines/{arg}{ext}",

	expect: {
		toHaveScreenshot: {
			// Fonts and Tailwind config carry over verbatim, so a real port
			// lands within antialiasing noise. A large diff is a finding.
			maxDiffPixelRatio: 0.01,
			animations: "disabled",
			caret: "hide",
		},
	},

	projects: [
		{
			name: "golden",
			testDir: "./e2e/specs",
			use: { ...devices["Desktop Chrome"], viewport: VIEWPORTS.desktop },
		},
		{
			name: "baselines",
			testMatch: /baselines\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
