import { expect, Locator, Page } from "@playwright/test";

import type { SeededUser } from "./api";

/**
 * Page helpers for the golden flows.
 *
 * Every locator in this file goes through a role, an accessible name, or
 * visible text. Nothing here may reference a CSS class, a DOM structure,
 * or a framework-specific test id -- that is the constraint that lets this
 * suite run unmodified against the Angular app (PLAN.md, "Parity harness").
 * If a control cannot be reached that way, the fix is to give it an
 * accessible name in the app, not to reach past the accessibility tree
 * here.
 */

/**
 * How long the harness waits between answers.
 *
 * Not cosmetic. The score a finished game posts includes notes-per-minute,
 * and the Go service's Entry DTO types that field as `int8` -- answering at
 * machine speed produces a rate above 127, the JSON bind fails, and the
 * save comes back 400. Roughly one answer per second keeps the rate inside
 * the range a human can actually produce, which is what these flows are
 * meant to represent. (The overflow itself is a real bug in the Go service,
 * recorded in .migration/phase-0-handoff.md; the service is out of scope
 * for this migration.)
 */
const ANSWER_INTERVAL_MS = 800;

/** Signs in through the login form, as a real user would. */
export async function login(page: Page, user: SeededUser): Promise<void> {
	await page.goto("/login");
	await page.getByLabel("Email Address").fill(user.email);
	await page.getByLabel("Password").fill(user.password);
	await page.getByRole("button", { name: "Sign In", exact: true }).click();
	await expect(page).toHaveURL(/\/dashboard$/);
}

/** The OSMD-rendered staff, on both the games and the sheet-music pages. */
export function staff(page: Page): Locator {
	return page.getByLabel(/^(Music staff|Sheet music display)$/);
}

/**
 * The staff renders random music, so no spec asserts what is on it -- only
 * that something is. OSMD draws into an SVG, so "rendered" means the
 * container has one and it has real size.
 */
export async function expectStaffRendered(page: Page): Promise<void> {
	const svg = staff(page).locator("svg").first();
	await expect(svg).toBeVisible({ timeout: 20_000 });
	const box = await svg.boundingBox();
	expect(box, "the staff SVG should have a layout box").not.toBeNull();
	expect(box!.width).toBeGreaterThan(50);
	expect(box!.height).toBeGreaterThan(20);
}

/**
 * Plays an identification game to game over.
 *
 * Answers are deliberately not checked for correctness: what is being
 * pinned is the loop (question renders -> answer accepted -> next question
 * -> game ends -> score saved), and forcing correct answers would mean
 * re-implementing each game's music theory in the harness.
 */
export async function playIdentificationGame(
	page: Page,
	answerLabel: string | RegExp,
	questions = 10,
): Promise<void> {
	await expectStaffRendered(page);

	const gameOver = page.getByRole("heading", { name: "Game Over!" });
	// One extra click of headroom: the game ends on the Nth answer, and a
	// question that is still hydrating swallows nothing -- but a stray
	// re-render should not fail the spec on an off-by-one.
	for (let i = 0; i < questions + 2; i++) {
		if (await gameOver.isVisible()) break;
		// `exact` matters: without it a plain label like "C" also matches
		// "C#", "Cb", and -- because Playwright's substring match treats an
		// empty accessible name as a match for anything -- whichever
		// unlabelled icon button happens to come first in the DOM. Clicking
		// that silently does nothing and the game never starts.
		await page
			.getByRole("button", { name: answerLabel, exact: true })
			.first()
			.click({ timeout: 20_000 });
		await page.waitForTimeout(ANSWER_INTERVAL_MS);
	}

	await expect(gameOver).toBeVisible({ timeout: 20_000 });
}

/**
 * Puts a game into "N questions" mode at the shortest limit, so a spec
 * finishes a game deterministically instead of waiting out a timer.
 *
 * The identification games keep this behind a Settings dialog; the note
 * game keeps it inline on the settings bar. Both are driven by button text.
 */
export async function useQuestionMode(
	page: Page,
	kind: "identification" | "note",
	limit = 10,
): Promise<void> {
	if (kind === "note") {
		await page.getByRole("button", { name: "notes", exact: true }).click();
		await page
			.getByRole("button", { name: String(limit), exact: true })
			.first()
			.click();
		return;
	}

	await page.getByRole("button", { name: "Settings" }).click();
	await page.getByRole("button", { name: "Questions", exact: true }).click();
	await page.getByLabel("Questions").selectOption(String(limit));
	await page.getByRole("button", { name: "Done" }).click();
}

/**
 * The note game's scale picker.
 *
 * The settings bar and the mobile drawer each render one, and which is on
 * screen depends on the viewport -- so the name alone matches two elements,
 * one of them hidden. Filtering on visibility (not on a class or a parent)
 * keeps this within the accessible tree.
 */
export function visibleScalePicker(page: Page): Locator {
	return page
		.getByRole("combobox", { name: "Scale" })
		.filter({ visible: true })
		.first();
}

/**
 * The theme toggle. Its accessible name states the theme it switches *to*,
 * so it doubles as the way a spec reads the current theme without touching
 * a CSS class or a store.
 */
export function themeToggle(page: Page): Locator {
	return page.getByRole("button", { name: /^Switch to (light|dark) theme$/ });
}

/**
 * Forces a theme by clicking the toggle if it is not already set.
 *
 * Deliberately not done by writing the store's localStorage key: that key
 * is Zustand's persist format, which the Angular signal store (D7) will
 * not reproduce, and this suite has to run against both apps unmodified.
 * The theme persists across navigations either way, so callers set it once
 * per browser context and then visit every route.
 */
export async function setTheme(
	page: Page,
	theme: "light" | "dark",
): Promise<void> {
	const toggle = themeToggle(page);
	await expect(toggle).toBeVisible();
	// "Switch to dark theme" is only offered while the page is light.
	const wantsSwitch = page.getByRole("button", {
		name: `Switch to ${theme} theme`,
	});
	if (await wantsSwitch.isVisible()) {
		await wantsSwitch.click();
		await expect(wantsSwitch).toBeHidden();
	}
}
