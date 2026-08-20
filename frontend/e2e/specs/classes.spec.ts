import { expect, test } from "@playwright/test";

import {
	createAssignment,
	createClass,
	createUser,
	unique,
	type SeededUser,
} from "../support/api";
import { expectScoreSaved, login } from "../support/app";

/**
 * Golden flows: a teacher creates a class, a student joins one, and a
 * student plays an assignment.
 *
 * These are the three places the app's two roles meet, and the only ones
 * guarded by role rather than by authentication -- /classes is behind
 * TeacherRoute, which becomes `teacher.guard.ts` in Angular (PLAN.md 4).
 * A student reaching the class list is the failure this pins.
 */
test.describe("classes", () => {
	let teacher: SeededUser;
	let student: SeededUser;

	test.beforeAll(async () => {
		teacher = await createUser("TEACHER");
		student = await createUser("STUDENT");
	});

	test("a teacher creates a class and gets a join code", async ({ page }) => {
		const name = unique("Symphonic Band");

		await login(page, teacher);
		await page.goto("/classes");
		await expect(
			page.getByRole("heading", { name: "My Classes" }),
		).toBeVisible();

		await page.getByRole("button", { name: "New class" }).click();
		await page.getByLabel("Class name").fill(name);
		await page.getByRole("button", { name: "Create class" }).click();

		// The new class is on the list, and it carries a six-character join
		// code -- the thing the teacher actually hands to students.
		const card = page.getByText(name, { exact: true });
		await expect(card).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Copy join code" }).first(),
		).toBeVisible();
	});

	test("keeps a student out of the teacher's class list", async ({ page }) => {
		await login(page, student);
		await page.goto("/classes");

		await expect(page).not.toHaveURL(/\/classes$/);
		await expect(
			page.getByRole("heading", { name: "My Classes" }),
		).toBeHidden();
	});

	test("a student joins a class by code", async ({ page }) => {
		const seeded = await createClass(teacher);

		await login(page, student);
		await page.goto("/assignments");
		await expect(
			page.getByRole("heading", { name: "Assignments", exact: true }),
		).toBeVisible();

		await page.getByLabel("Class code").fill(seeded.joinCode);
		await page.getByRole("button", { name: "Join", exact: true }).click();

		await expect(page.getByText(seeded.name).first()).toBeVisible();
	});

	test("a student plays an assignment and records an attempt", async ({
		page,
	}) => {
		const seeded = await createClass(teacher);
		const assignment = await createAssignment(teacher, seeded.id, {
			gameType: "key_signature",
			config: { gameMode: "notes", noteLimit: 10, timeLimit: 30 },
		});
		const joiner = await createUser("STUDENT");
		await login(page, joiner);

		await page.goto("/assignments");
		await page.getByLabel("Class code").fill(seeded.joinCode);
		await page.getByRole("button", { name: "Join", exact: true }).click();
		await expect(page.getByText(seeded.name).first()).toBeVisible();

		// Reload rather than expecting the join to refresh the assignment
		// list in place: today's React app caches that list and does not
		// invalidate it on join, and the assignments only appear on the next
		// load. Asserting either behaviour here would bake one framework's
		// caching policy into the parity suite -- and Angular's resources do
		// not cache at all (D6), so it would refetch anyway.
		await page.reload();

		const row = page.getByText(assignment.title, { exact: true });
		await expect(row).toBeVisible();
		await expect(page.getByText("No attempts yet").first()).toBeVisible();

		await page.getByRole("button", { name: "Practice" }).first().click();
		await expect(page).toHaveURL(/\/assignments\/\d+\/play$/);

		// The assignment's frozen config drives the game -- the student never
		// picks the mode, so there is no settings step here.
		const gameOver = page.getByRole("heading", { name: "Game Over!" });
		for (let i = 0; i < 12; i++) {
			if (await gameOver.isVisible()) break;
			await page
				.getByRole("button", { name: "C", exact: true })
				.first()
				.click({ timeout: 20_000 });
			await page.waitForTimeout(800);
		}
		await expect(gameOver).toBeVisible({ timeout: 20_000 });

		// Game over and save-complete are different moments; leaving the page
		// in between aborts the POST and the attempt is lost.
		await expectScoreSaved(page);

		// Back on the list, the attempt is counted against the assignment.
		await page.goto("/assignments");
		await expect(page.getByText(/1 attempt\b/).first()).toBeVisible();
	});
});
