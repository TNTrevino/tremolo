import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { GameStateService } from "@features/identification-game";

import { NoteGameService } from "./note-game.service";

/**
 * The overlap layout, from the service that owns the flag.
 *
 * `NoteGameService` is the only caller of `GameStateService`'s `isCorrect`
 * hook, so this is where the "same pitch counts" rule is pinned end to end:
 * the flag flips the key map *and* the verdict, and with the flag off the
 * game answers exactly as it did before the flag existed.
 *
 * `NoteAudioService` fetches its twelve samples in the constructor, so the
 * HTTP testing backend is here to swallow them; jsdom has no `AudioContext`,
 * so playback is already a no-op.
 */

/** Shown on the staff, and the natural key that plays it. */
const LETTER_CROSSING_PAIRS = [
	["E#", "F"],
	["B#", "C"],
	["Cb", "B"],
	["Fb", "E"],
] as const;

describe("NoteGameService", () => {
	let game: NoteGameService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				GameStateService,
				NoteGameService,
			],
		});
		game = TestBed.inject(NoteGameService);
	});

	afterEach(() => {
		// The preload requests are noise, not the subject.
		TestBed.inject(HttpTestingController).match(() => true);
	});

	describe("the key map", () => {
		it("is the default 21-note table with the flag off", () => {
			expect(game.keyToNoteMap()["z"]).toBe("Cb");
			expect(game.keyToNoteMap()["q"]).toBe("C#");
		});

		it("becomes piano-shaped with the flag on", () => {
			game.overlapAccidentals.set(true);

			expect(game.keyToNoteMap()["w"]).toBe("C#");
			expect(game.keyToNoteMap()["a"]).toBe("C");
			// The flats row and the two octave-wrapping sharps lose their keys.
			expect(game.keyToNoteMap()["z"]).toBeUndefined();
			expect(game.keyToNoteMap()["q"]).toBeUndefined();
		});

		it("keeps the player's own naturals when it switches", () => {
			game.keyBindings.set({ C: "1", "C#": "9", Cb: "8" });
			game.overlapAccidentals.set(true);

			expect(game.keyToNoteMap()["1"]).toBe("C");
			expect(game.keyToNoteMap()["9"]).toBeUndefined();
			expect(game.keyToNoteMap()["w"]).toBe("C#");
		});
	});

	describe("the answer verdict", () => {
		it("rejects an enharmonic guess with the flag off", () => {
			game.syncCurrentNote("Db");
			game.handleAnswer("C#");

			expect(game.answers()[0]).toMatchObject({ note: "Db", correct: false });
		});

		it("accepts an enharmonic guess with the flag on", () => {
			game.overlapAccidentals.set(true);
			game.syncCurrentNote("Db");
			game.handleAnswer("C#");

			expect(game.answers()[0]).toMatchObject({ note: "Db", correct: true });
		});

		it("accepts the four pairs that cross a letter boundary", () => {
			game.overlapAccidentals.set(true);

			for (const [shown, pressed] of LETTER_CROSSING_PAIRS) {
				game.syncCurrentNote(shown);
				game.handleAnswer(pressed);
			}

			expect(game.answers()).toHaveLength(4);
			expect(game.answers().every((a) => a.correct)).toBe(true);
		});

		it("still rejects a note that is not the same pitch", () => {
			game.overlapAccidentals.set(true);
			game.syncCurrentNote("Db");
			game.handleAnswer("D");

			expect(game.answers()[0]).toMatchObject({ correct: false });
		});

		it("logs an accepted enharmonic guess under the spelling shown", () => {
			// The stats nuance: an enharmonic hit is a correct answer to the
			// question that was asked, not to the key that was pressed.
			game.overlapAccidentals.set(true);
			game.syncCurrentNote("Gb");
			game.handleAnswer("F#");
			game.endGame();

			expect(game.answers()[0]?.note).toBe("Gb");
			expect(game.gameStats()).toMatchObject({
				correct: 1,
				total: 1,
				accuracy: 100,
			});
		});
	});
});
