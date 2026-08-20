import { expect, test } from "@playwright/test";

import { createUser, recentEntries, type SeededUser } from "../support/api";
import {
	expectScoreSaved,
	expectStaffRendered,
	login,
	playIdentificationGame,
	useQuestionMode,
} from "../support/app";

/**
 * Golden flow: play each of the five games through to game over with a
 * score saved.
 *
 * The five share one loop -- staff renders, answers are accepted, the game
 * ends at the limit, the attempt is persisted -- so they are pinned the
 * same way. Only the answer pad differs, which is exactly the part each
 * GameDefinition owns (PLAN.md 5.7).
 *
 * Nothing here asserts a *correct* answer: the questions are randomly
 * generated server-side, so checking correctness would mean porting each
 * game's theory into the harness. Accuracy is the app's business; the loop
 * is the harness's.
 */

/** One entry per identification game: route, and a label on its answer pad. */
const IDENTIFICATION_GAMES = [
	{
		name: "key signature",
		path: "/key-signature-game",
		gameType: "key_signature",
		answer: "C",
	},
	{
		name: "interval",
		path: "/interval-game",
		gameType: "interval",
		answer: /^(P1|Unison|m2)/,
	},
	{ name: "scale", path: "/scale-game", gameType: "scale", answer: /^Major/ },
	{ name: "chord", path: "/chord-game", gameType: "chord", answer: /^Major/ },
] as const;

test.describe("games", () => {
	let student: SeededUser;

	test.beforeAll(async () => {
		student = await createUser("STUDENT");
	});

	for (const game of IDENTIFICATION_GAMES) {
		test(`plays the ${game.name} game to game over and saves the score`, async ({
			page,
		}) => {
			await login(page, student);
			const before = await recentEntries(student, game.gameType);

			await page.goto(game.path);
			await useQuestionMode(page, "identification");
			await playIdentificationGame(page, game.answer);

			await expectScoreSaved(page);
			await expect(page.getByText(/Accuracy/)).toBeVisible();
			await expect(
				page.getByRole("button", { name: /play again/i }),
			).toBeVisible();

			// The score reached the database, not just the results screen.
			await expect
				.poll(
					async () => (await recentEntries(student, game.gameType)).length,
					{
						timeout: 15_000,
					},
				)
				.toBe(before.length + 1);
		});
	}

	test("plays the note game to game over and saves the score", async ({
		page,
	}) => {
		await login(page, student);
		const before = await recentEntries(student, "note");

		await page.goto("/note-game");
		await useQuestionMode(page, "note");
		await playIdentificationGame(page, /^C(\s|$)/);
		await expectScoreSaved(page);

		await expect
			.poll(async () => (await recentEntries(student, "note")).length, {
				timeout: 15_000,
			})
			.toBe(before.length + 1);
	});

	test("renders a staff on every game before the first answer", async ({
		page,
	}) => {
		for (const path of [
			"/note-game",
			...IDENTIFICATION_GAMES.map((g) => g.path),
		]) {
			await page.goto(path);
			await expectStaffRendered(page);
		}
	});
});
