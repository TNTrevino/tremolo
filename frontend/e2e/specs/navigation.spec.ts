import { expect, test } from "@playwright/test";

import { ROUTES } from "../routes";
import {
	createAssignment,
	createClass,
	createUser,
	joinClass,
	type SeededUser,
} from "../support/api";
import { login } from "../support/app";

/**
 * Every route resolves, for the role that is allowed to see it.
 *
 * This is the coarsest spec in the suite and the first one Phase 1 has to
 * make pass: it says nothing about what a page contains, only that the
 * router reaches it and that the page renders rather than erroring. The
 * per-feature specs cover content.
 */
test.describe("routing", () => {
	let teacher: SeededUser;
	let student: SeededUser;
	let classId: number;
	let assignmentId: number;

	test.beforeAll(async () => {
		teacher = await createUser("TEACHER");
		student = await createUser("STUDENT");
		const seeded = await createClass(teacher);
		classId = seeded.id;
		await joinClass(student, seeded.joinCode);
		assignmentId = (await createAssignment(teacher, classId)).id;
	});

	/** Fills in the :id placeholders with the seeded records. */
	const resolve = (path: string) =>
		path
			.replace("/classes/:id", `/classes/${classId}`)
			.replace("/assignments/:id/play", `/assignments/${assignmentId}/play`);

	for (const route of ROUTES.filter((r) => r.access === "public")) {
		test(`serves ${route.path} to anyone`, async ({ page }) => {
			const response = await page.goto(resolve(route.path));

			expect(response?.status(), `${route.path} should not 404`).toBeLessThan(
				400,
			);
			await expect(page.getByRole("navigation")).toBeVisible();
			await expectNoCrash(page);
		});
	}

	for (const route of ROUTES.filter((r) => r.access === "guest")) {
		test(`serves ${route.path} to a signed-out visitor`, async ({ page }) => {
			await page.goto(resolve(route.path));

			await expect(page).toHaveURL(new RegExp(`${route.path}$`));
			await expectNoCrash(page);
		});
	}

	for (const route of ROUTES.filter((r) => r.access === "student")) {
		test(`serves ${route.path} to a signed-in student`, async ({ page }) => {
			await login(page, student);
			await page.goto(resolve(route.path));

			await expect(page).not.toHaveURL(/\/login$/);
			await expectNoCrash(page);
		});
	}

	for (const route of ROUTES.filter((r) => r.access === "teacher")) {
		test(`serves ${route.path} to a signed-in teacher`, async ({ page }) => {
			await login(page, teacher);
			await page.goto(resolve(route.path));

			await expect(page).not.toHaveURL(/\/login$/);
			await expectNoCrash(page);
		});
	}

	test("sends / to the note game", async ({ page }) => {
		await page.goto("/");

		await expect(page).toHaveURL(/\/note-game$/);
	});

	/**
	 * Not in ROUTES (that list is the React parity set), so this is the
	 * only e2e coverage of the `**` wildcard added in #263.
	 */
	test("shows the 404 page for an unknown route", async ({ page }) => {
		await page.goto("/definitely-not-a-route");

		await expect(
			page.getByRole("heading", { name: "This page is off the staff" }),
		).toBeVisible();
	});
});

/**
 * The app catches render errors in an error boundary rather than showing a
 * blank page, so "it rendered" is checked by the absence of that fallback.
 */
async function expectNoCrash(page: import("@playwright/test").Page) {
	await expect(
		page.getByText(/something went wrong|unexpected error/i),
	).toHaveCount(0);
}
