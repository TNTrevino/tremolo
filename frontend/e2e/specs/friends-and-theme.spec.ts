import { expect, test } from "@playwright/test";

import { createUser, unique, type SeededUser } from "../support/api";
import { login, setTheme, themeToggle } from "../support/app";

/**
 * Golden flows: add and list friends, and toggle the theme.
 *
 * The friends panel is the app's one piece of persistent chrome outside
 * the router outlet -- it hangs off the shell, not off a route -- so it is
 * also the spec that catches an Angular port that mounts it in the wrong
 * place.
 */
test.describe("friends", () => {
	let student: SeededUser;
	let other: SeededUser;

	test.beforeAll(async () => {
		student = await createUser("STUDENT");
		other = await createUser("STUDENT", {
			firstName: unique("Amiga").replace(/-/g, ""),
		});
	});

	test("adds a friend by search and lists them", async ({ page }) => {
		await login(page, student);

		await page.getByRole("button", { name: "Open friends" }).click();
		await expect(page.getByRole("heading", { name: "Friends" })).toBeVisible();
		await expect(page.getByText(/looks lonely in here/i)).toBeVisible();

		await page.getByRole("button", { name: "Add friend" }).click();
		await expect(
			page.getByRole("heading", { name: "Add Friend" }),
		).toBeVisible();
		await page.getByPlaceholder("Search by name...").fill(other.firstName);

		const fullName = `${other.firstName} ${other.lastName}`;
		const add = page.getByRole("button", { name: `Add ${fullName}` });
		await expect(add).toBeVisible({ timeout: 15_000 });
		await add.click();

		// The button flips to its "added" state in place.
		await expect(
			page.getByRole("button", { name: `${fullName} added` }),
		).toBeVisible();

		// ...and the friend is on the list when we come back to it.
		await page.getByRole("button", { name: "Back to friends" }).click();
		await expect(page.getByText(fullName).first()).toBeVisible();
	});

	test("hides the friends panel from anonymous visitors", async ({ page }) => {
		await page.goto("/note-game");

		await expect(
			page.getByRole("button", { name: "Open friends" }),
		).toBeHidden();
	});
});

test.describe("theme", () => {
	test("toggles between light and dark and survives a reload", async ({
		page,
	}) => {
		await page.goto("/home");

		// The toggle names the theme it switches *to*, so it also reports the
		// current one -- no CSS class or store read required.
		await setTheme(page, "light");
		await expect(
			page.getByRole("button", { name: "Switch to dark theme" }),
		).toBeVisible();

		await themeToggle(page).click();
		await expect(
			page.getByRole("button", { name: "Switch to light theme" }),
		).toBeVisible();

		// Persisted, not just held in memory.
		await page.reload();
		await expect(
			page.getByRole("button", { name: "Switch to light theme" }),
		).toBeVisible();
	});

	test("keeps the theme when navigating between routes", async ({ page }) => {
		await page.goto("/home");
		await setTheme(page, "light");

		await page.goto("/about");
		await expect(
			page.getByRole("button", { name: "Switch to dark theme" }),
		).toBeVisible();
	});
});
