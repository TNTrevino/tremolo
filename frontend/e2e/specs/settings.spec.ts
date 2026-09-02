import { expect, test } from "@playwright/test";

import { createUser, type SeededUser } from "../support/api";
import {
	login,
	playIdentificationGame,
	useQuestionMode,
	visibleScalePicker,
} from "../support/app";

/**
 * Golden flow: settings persist across a reload.
 *
 * The save is deliberately not immediate -- a game persists the settings
 * it is about to play with when the *first answer* starts the game, not
 * when a control is clicked (see `onGameStart` in the React shell). So the
 * flow is: change a setting, start a game, reload, and find the change
 * still there. A port that saves on every click would pass this spec while
 * hammering the API; a port that never saves would fail it.
 */
test.describe("settings persistence", () => {
	let student: SeededUser;

	test.beforeAll(async () => {
		student = await createUser("STUDENT");
	});

	test("an identification game remembers mode and limit", async ({ page }) => {
		await login(page, student);
		await page.goto("/scale-game");

		await useQuestionMode(page, "identification", 25);
		// Starting the game is what commits the settings.
		await playIdentificationGame(page, /^Major/, 25);

		await page.goto("/scale-game");
		await page.getByRole("button", { name: "Settings" }).click();

		await expect(page.getByLabel("Questions")).toHaveValue("25");
		await page.getByRole("button", { name: "Done" }).click();
	});

	test("the note game remembers its scale", async ({ page }) => {
		await login(page, student);
		await page.goto("/note-game");

		await useQuestionMode(page, "note");
		// Two scale pickers exist -- the settings bar and the mobile drawer --
		// and only one of them is on screen at a given viewport.
		const scale = visibleScalePicker(page);
		await scale.selectOption("G Major");
		await playIdentificationGame(page, /^C(\s|$)/);

		await page.goto("/note-game");
		await expect(visibleScalePicker(page)).toHaveValue("G Major");
	});

	test("an anonymous player keeps settings for the session but not the reload", async ({
		page,
	}) => {
		await page.goto("/scale-game");
		await useQuestionMode(page, "identification", 25);

		// Still set while the page lives.
		await page.getByRole("button", { name: "Settings" }).click();
		await expect(page.getByLabel("Questions")).toHaveValue("25");
		await page.getByRole("button", { name: "Done" }).click();

		// ...and back to the game's defaults after a reload, because there is
		// no account to persist them to. The scale game defaults to timed
		// mode, so the limit control goes back to being a time limit.
		await page.reload();
		await page.getByRole("button", { name: "Settings" }).click();
		await expect(page.getByLabel("Time Limit")).toBeVisible();
		await expect(page.getByLabel("Questions")).toBeHidden();
	});
});
