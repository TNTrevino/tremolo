import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import type { Mock } from "vitest";

import {
	GameMode,
	GameState,
	type BaseGameSettings,
	type GameStats,
} from "../models/game-state.models";
import { GameStateService } from "./game-state.service";

/**
 * The state machine and the scoring arithmetic.
 *
 * The scoring cases are fixtures rather than round trips: `npm` and
 * `accuracy` are what a player sees on the results screen and what reaches
 * `note_game_entries`, so they are pinned to exact numbers with the clock
 * held still.
 */

const settingsOf = (overrides: Partial<BaseGameSettings> = {}) =>
	signal<BaseGameSettings>({
		gameMode: GameMode.Time,
		timeLimit: 60,
		noteLimit: 25,
		...overrides,
	});

describe("GameStateService", () => {
	let game: GameStateService;
	let onGameStart: Mock<() => void>;
	let onGameEnd: Mock<(stats: GameStats) => void>;
	let onCorrectAnswer: Mock<(answer: string) => void>;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-20T12:00:00Z"));

		onGameStart = vi.fn<() => void>();
		onGameEnd = vi.fn<(stats: GameStats) => void>();
		onCorrectAnswer = vi.fn<(answer: string) => void>();

		TestBed.configureTestingModule({ providers: [GameStateService] });
		game = TestBed.inject(GameStateService);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function configure(settings = settingsOf()): void {
		game.configure({ settings, onGameStart, onGameEnd, onCorrectAnswer });
	}

	describe("the state machine", () => {
		it("starts Ready and stays there until the first answer", () => {
			configure();

			expect(game.state()).toBe(GameState.Ready);
			expect(game.isReady()).toBe(true);
			expect(onGameStart).not.toHaveBeenCalled();
		});

		it("moves Ready -> Playing on the first answer, once", () => {
			configure();
			game.syncCurrentAnswer("C");

			game.answer("C");
			expect(game.state()).toBe(GameState.Playing);
			expect(onGameStart).toHaveBeenCalledTimes(1);

			game.syncCurrentAnswer("D");
			game.answer("D");
			expect(game.state()).toBe(GameState.Playing);
			expect(onGameStart).toHaveBeenCalledTimes(1);
		});

		it("moves Playing -> GameOver when the question limit is reached", () => {
			configure(settingsOf({ gameMode: GameMode.Notes, noteLimit: 3 }));

			for (let i = 0; i < 3; i++) {
				game.syncCurrentAnswer("C");
				game.answer("C");
			}

			expect(game.state()).toBe(GameState.GameOver);
			expect(game.isGameOver()).toBe(true);
			expect(onGameEnd).toHaveBeenCalledTimes(1);
		});

		it("does not end a timed game at the question limit", () => {
			configure(settingsOf({ gameMode: GameMode.Time, noteLimit: 2 }));

			for (let i = 0; i < 5; i++) {
				game.syncCurrentAnswer("C");
				game.answer("C");
			}

			expect(game.state()).toBe(GameState.Playing);
			expect(onGameEnd).not.toHaveBeenCalled();
		});

		it("returns to Ready on reset, keeping nothing from the last game", () => {
			configure(settingsOf({ gameMode: GameMode.Notes, noteLimit: 1 }));
			game.syncCurrentAnswer("C");
			game.answer("C");
			expect(game.stats()).not.toBeNull();

			game.reset();

			expect(game.state()).toBe(GameState.Ready);
			expect(game.stats()).toBeNull();
			expect(game.answers()).toEqual([]);
		});
	});

	describe("the answer log", () => {
		it("records the correct answer, the verdict and the time taken", () => {
			configure();
			game.syncCurrentAnswer("Eb");
			vi.advanceTimersByTime(1500);
			game.answer("Eb");

			expect(game.answers()).toEqual([
				{ note: "Eb", correct: true, timeToAnswer: 1500 },
			]);
			expect(onCorrectAnswer).toHaveBeenCalledWith("Eb");
		});

		it("logs a wrong guess against the answer that was correct", () => {
			configure();
			game.syncCurrentAnswer("F#");
			game.answer("Gb");

			expect(game.answers()[0]).toMatchObject({ note: "F#", correct: false });
			expect(onCorrectAnswer).not.toHaveBeenCalled();
		});
	});

	describe("scoring", () => {
		/** Plays `total` questions, `correct` of them right, over `ms`. */
		function play(total: number, correct: number, ms: number): GameStats {
			configure();
			for (let i = 0; i < total; i++) {
				game.syncCurrentAnswer("C");
				game.answer(i < correct ? "C" : "D");
			}
			vi.advanceTimersByTime(ms);
			game.endGame();
			return game.stats()!;
		}

		it("computes 10 questions in 60s as 10 npm at 80% accuracy", () => {
			// 10 / (60_000 / 1000 / 60) = 10 questions per minute.
			const stats = play(10, 8, 60_000);

			expect(stats).toEqual({
				npm: 10,
				accuracy: 80,
				correct: 8,
				total: 10,
				gameMode: GameMode.Time,
				limit: 60,
			});
		});

		it("computes 25 questions in 30s as 50 npm at 100% accuracy", () => {
			const stats = play(25, 25, 30_000);

			expect(stats.npm).toBe(50);
			expect(stats.accuracy).toBe(100);
		});

		it("rounds both figures rather than truncating", () => {
			// 3 correct of 7 is 42.857%, and 7 in 45s is 9.333 per minute.
			const stats = play(7, 3, 45_000);

			expect(stats.accuracy).toBe(43);
			expect(stats.npm).toBe(9);
		});

		it("reports zeroes for a game with no answers", () => {
			configure();
			game.endGame();

			expect(game.stats()).toMatchObject({
				npm: 0,
				accuracy: 0,
				correct: 0,
				total: 0,
			});
		});

		it("reports the note limit as the limit in questions mode", () => {
			const settings = settingsOf({ gameMode: GameMode.Notes, noteLimit: 10 });
			game.configure({ settings, onGameEnd });
			game.syncCurrentAnswer("C");
			game.answer("C");
			game.endGame();

			expect(game.stats()).toMatchObject({
				gameMode: GameMode.Notes,
				limit: 10,
			});
		});

		it("merges statsExtras into the stats", () => {
			game.configure({
				settings: settingsOf(),
				statsExtras: () => ({ scale: "G Major" }),
			});
			game.endGame();

			expect(game.stats()).toMatchObject({ scale: "G Major" });
		});
	});

	describe("ending exactly once", () => {
		it("ignores a second endGame, so the score saves once", () => {
			configure();
			game.syncCurrentAnswer("C");
			game.answer("C");

			game.endGame();
			game.endGame();
			game.endGame();

			expect(onGameEnd).toHaveBeenCalledTimes(1);
		});

		it("ignores a timer expiry that lands on the last answer", () => {
			// The questions-mode branch ends the game inside `answer()`; a
			// countdown hitting zero on the same tick must not end it again.
			configure(settingsOf({ gameMode: GameMode.Notes, noteLimit: 2 }));
			game.syncCurrentAnswer("C");
			game.answer("C");
			game.syncCurrentAnswer("C");
			game.answer("C");
			expect(onGameEnd).toHaveBeenCalledTimes(1);

			game.endGame();

			expect(onGameEnd).toHaveBeenCalledTimes(1);
		});

		it("ends again after a reset, because that is a new game", () => {
			configure();
			game.endGame();
			game.reset();
			game.endGame();

			expect(onGameEnd).toHaveBeenCalledTimes(2);
		});
	});
});
