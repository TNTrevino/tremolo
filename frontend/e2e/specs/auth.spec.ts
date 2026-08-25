import { expect, test } from "@playwright/test";

import { createUser, unique, type SeededUser } from "../support/api";
import { login } from "../support/app";

/**
 * Golden flow: login -> dashboard.
 *
 * Also pins the two route guards a user can feel: an anonymous visitor
 * cannot reach the dashboard, and a signed-in one cannot go back to the
 * login form. In Angular these become functional guards (PLAN.md 4), so
 * these three specs are the acceptance criteria for that swap.
 */
test.describe("authentication", () => {
	let student: SeededUser;

	test.beforeAll(async () => {
		student = await createUser("STUDENT");
	});

	test("signs in and lands on the dashboard", async ({ page }) => {
		await login(page, student);

		await expect(
			page.getByText(`${student.firstName} ${student.lastName}`).first(),
		).toBeVisible();
	});

	test("rejects a wrong password without navigating", async ({ page }) => {
		await page.goto("/login");
		await page.getByLabel("Email Address").fill(student.email);
		await page.getByLabel("Password").fill("NotTheP4ssword!");
		await page.getByRole("button", { name: "Sign In", exact: true }).click();

		// Deliberately loose on the wording. Today the React 401 interceptor
		// treats the rejected login as a session expiry and the form ends up
		// showing "Please log in again" rather than "Invalid credentials";
		// PLAN.md 5.4's interceptor excludes auth endpoints, so Angular is
		// expected to show the server's message instead. What must not change
		// is the behaviour: an error is shown, and the user stays put.
		await expect(
			page.getByText(/invalid|incorrect|failed|log in again/i).first(),
		).toBeVisible();
		await expect(page).toHaveURL(/\/login$/);
		await expect(
			page.getByRole("button", { name: "Sign In", exact: true }),
		).toBeVisible();
	});

	test("sends an anonymous visitor from the dashboard to login", async ({
		page,
	}) => {
		await page.goto("/dashboard");

		await expect(page).toHaveURL(/\/login$/);
		await expect(
			page.getByRole("heading", { name: "Welcome to Tremolo" }),
		).toBeVisible();
	});

	test("keeps a signed-in user away from the login form", async ({ page }) => {
		await login(page, student);
		await page.goto("/login");

		await expect(page).not.toHaveURL(/\/login$/);
	});

	test("signs up a new student and signs them in", async ({ page }) => {
		const email = `${unique("e2e-signup")}@tremolo.test`;

		await page.goto("/signup");
		await page.getByLabel("First Name").fill("Newton");
		await page.getByLabel("Last Name").fill("Signup");
		await page.getByLabel("Email Address").fill(email);
		await page.getByLabel("Password", { exact: true }).fill("E2ePassw0rd!");
		await page.getByLabel("Confirm Password").fill("E2ePassw0rd!");
		await page.getByLabel("I am a...").selectOption("STUDENT");
		await page.getByRole("button", { name: "Create Account" }).click();

		await expect(page).toHaveURL(/\/login$/);
		await expect(
			page.getByText("Account created! Please log in."),
		).toBeVisible();

		// The account is real: the credentials just created sign in.
		await page.getByLabel("Email Address").fill(email);
		await page.getByLabel("Password").fill("E2ePassw0rd!");
		await page.getByRole("button", { name: "Sign In", exact: true }).click();
		await expect(page).toHaveURL(/\/dashboard$/);
	});

	/**
	 * New behaviour, not a parity spec: #250 put the TEACHER role behind an
	 * invite code. The field only exists once Teacher is chosen, and a code
	 * the server rejects is shown next to the input the user has to retype.
	 */
	test("gates a teacher signup on an invite code", async ({ page }) => {
		await page.goto("/signup");
		await expect(page.getByLabel("Invite code")).toBeHidden();

		await page.getByLabel("I am a...").selectOption("TEACHER");
		await expect(page.getByLabel("Invite code")).toBeVisible();

		await page.getByLabel("First Name").fill("Tina");
		await page.getByLabel("Last Name").fill("Teacher");
		await page
			.getByLabel("Email Address")
			.fill(`${unique("e2e-signup-teacher")}@tremolo.test`);
		await page.getByLabel("Password", { exact: true }).fill("E2ePassw0rd!");
		await page.getByLabel("Confirm Password").fill("E2ePassw0rd!");
		await page.getByLabel("Invite code").fill("ZZZZZZZZ");
		await page.getByRole("button", { name: "Create Account" }).click();

		await expect(page.getByText(/invite code is not valid/i)).toBeVisible();
		await expect(page).toHaveURL(/\/signup$/);
	});
});
