import { expect, test, type Page } from "@playwright/test";

import { VIEWPORTS } from "../playwright.config";
import { ROUTES, type AppRoute } from "./routes";
import {
	createAssignment,
	createClass,
	createUser,
	joinClass,
	type SeededUser,
} from "./support/api";
import { login, setTheme, staff } from "./support/app";

/**
 * The screenshot baselines: 20 routes x 2 viewports x 2 themes = 80 shots,
 * written to .migration/baselines/.
 *
 * Capture (against the React app, once):
 *
 *   npm run e2e:baselines -- --update-snapshots
 *
 * Compare (any later phase, against Angular):
 *
 *   E2E_BASE_URL=http://localhost:4200 npm run e2e:baselines
 *
 * Dynamic-content carve-out (PLAN.md, "Parity harness"): the games and the
 * sheet-music page draw randomly generated music, so the staff region is
 * masked and the chrome around it is what gets diffed. That the staff drew
 * anything at all is asserted separately, in games.spec.ts.
 */

const THEMES = ["light", "dark"] as const;

/** Which routes each pass photographs. */
const PASSES = [
	{ role: "anonymous", covers: ["public", "guest"] },
	{ role: "student", covers: ["student"] },
	{ role: "teacher", covers: ["teacher"] },
] as const;

test.describe("baselines", () => {
	let teacher: SeededUser;
	let student: SeededUser;
	let classId: number;
	let assignmentId: number;

	test.beforeAll(async () => {
		teacher = await createUser("TEACHER", {
			firstName: "Baseline",
			lastName: "Teacher",
		});
		student = await createUser("STUDENT", {
			firstName: "Baseline",
			lastName: "Student",
		});
		const seeded = await createClass(teacher, "Baseline Class");
		classId = seeded.id;
		await joinClass(student, seeded.joinCode);
		assignmentId = (
			await createAssignment(teacher, classId, { title: "Baseline Assignment" })
		).id;
	});

	for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
		for (const theme of THEMES) {
			test(`${viewportName} / ${theme}`, async ({ browser }) => {
				// 20 routes, each waiting on fonts and on OSMD.
				test.setTimeout(5 * 60_000);
				const suffix = `${viewportName}-${theme}`;

				// One browser context per role. Signing in and out inside a
				// single context is not enough: the session lives in
				// localStorage next to the persisted theme, so clearing one
				// clears the other. Separate contexts keep both honest.
				for (const pass of PASSES) {
					const context = await browser.newContext({ viewport });
					const page = await context.newPage();
					try {
						await page.goto("/home");
						await setTheme(page, theme);

						if (pass.role === "student") await login(page, student);
						if (pass.role === "teacher") await login(page, teacher);

						for (const route of ROUTES) {
							if (!(pass.covers as readonly string[]).includes(route.access)) {
								continue;
							}
							await capture(page, route, suffix);
						}
					} finally {
						await context.close();
					}
				}
			});
		}
	}

	async function capture(
		page: Page,
		route: AppRoute,
		suffix: string,
	): Promise<void> {
		const path = route.path
			.replace("/classes/:id", `/classes/${classId}`)
			.replace("/assignments/:id/play", `/assignments/${assignmentId}/play`);

		await page.goto(path);
		await settle(page, route);

		await expect(page).toHaveScreenshot(`${route.slug}-${suffix}.png`, {
			fullPage: true,
			// Everything the app draws from random data. Masked rather than
			// excluded so a layout shift around it still shows up.
			mask: [staff(page)],
		});
	}
});

/**
 * Waits for the page to stop moving. Fonts have to be loaded before any
 * shot or every baseline is a fallback-font baseline, and OSMD renders
 * asynchronously after its fetch resolves.
 */
async function settle(page: Page, route: AppRoute): Promise<void> {
	await page.evaluate(() => document.fonts.ready);
	if (route.dynamic) {
		// A route that only sometimes draws a staff (the redirect target, an
		// assignment whose game failed to load) still gets photographed --
		// the mask simply covers nothing.
		await staff(page)
			.first()
			.waitFor({ state: "visible", timeout: 20_000 })
			.catch(() => undefined);
	}
	// The games keep a prefetch buffer topped up, so the network never goes
	// fully quiet on them; a timeout here is not a failure.
	await page
		.waitForLoadState("networkidle", { timeout: 10_000 })
		.catch(() => undefined);
}
