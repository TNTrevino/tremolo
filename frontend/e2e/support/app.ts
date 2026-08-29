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
 * save comes back 400 and the score is silently lost.
 *
 * 1200ms puts a 10-question game at roughly 50 notes-per-minute, which is
 * well clear of the ceiling and is also just what these flows are for:
 * representing a human playing, and a human does not answer four times a
 * second. 800ms worked too (it measures around 80) -- the extra margin is
 * deliberate, not a fix for an observed failure at 800ms.
 *
 * The 400s that showed up while this suite was being written were a
 * *different* bug in the same DTO -- `correct_questions` rejecting a zero,
 * see expectScoreOutcomeReported() -- not this one. Both are real; both are
 * recorded in .migration/phase-0-handoff.md; the Go service is out of scope
 * for this migration.
 */
const ANSWER_INTERVAL_MS = 1200;

/** Signs in through the login form, as a real user would. */
export async function login(page: Page, user: SeededUser): Promise<void> {
	await page.goto("/login");
	await page.getByLabel("Email Address").fill(user.email);
	await page.getByLabel("Password", { exact: true }).fill(user.password);
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
 * -> game ends -> the score's fate is reported), and forcing correct
 * answers would mean
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
 * How many of the finished game's questions were answered correctly, read
 * off the results screen.
 */
export async function correctCount(page: Page): Promise<number> {
	const summary = await page
		.getByText(/^Score: \d+\/\d+$/)
		.first()
		.textContent();
	const match = /Score: (\d+)\/(\d+)/.exec(summary ?? "");
	expect(
		match,
		"the results screen should show Score: correct/total",
	).not.toBeNull();
	return Number(match![1]);
}

/**
 * Asserts the app reported what happened to the finished game's score.
 *
 * Two things make this more than "wait for a toast":
 *
 * 1. Game over and save-complete are different moments -- the POST is fired
 *    when the game ends -- so anything that reads the score afterwards is
 *    racing the request unless it waits here first.
 *
 * 2. The Go service **rejects a game with zero correct answers**: the DTO
 *    marks `correct_questions` `validate:"required"`, and `required` refuses
 *    a zero, so the save comes back 400. The specs answer without knowing
 *    the right answer (deliberately -- see games.spec.ts), so a run that
 *    scores nothing is normal and must not be reported as a frontend
 *    failure. What is asserted is that the frontend told the player the
 *    truth either way, which is behaviour the Angular port owes as well.
 *
 * Returns whether the score was actually persisted.
 */
export async function expectScoreOutcomeReported(page: Page): Promise<boolean> {
	const saved = (await correctCount(page)) > 0;

	await expect(
		page.getByText(
			saved
				? "Game results saved successfully!"
				: /Failed to save game results/,
		),
	).toBeVisible({ timeout: 15_000 });

	return saved;
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

	// Verified, not assumed. If the mode switch does not land the game stays
	// on its default timer and the spec fails much later, as a timeout on a
	// game-over that is thirty seconds away rather than ten questions away.
	const limitPicker = page.getByLabel("Questions");
	await expect(limitPicker).toBeVisible();
	await limitPicker.selectOption(String(limit));
	await expect(limitPicker).toHaveValue(String(limit));

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
