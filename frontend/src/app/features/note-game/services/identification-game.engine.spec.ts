import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GameStats } from "../models/engine.models";
import { GameMode, GameState } from "../models/engine.models";
import type { GameSettings } from "../models/note-game.models";
import { IdentificationGameEngine } from "./identification-game.engine";

/**
 * The engine's scoring is the note game's product, so it is pinned against
 * fixtures rather than re-derived: every expectation below was computed from
 * `useIdentificationGame.endGame` in the React source.
 *
 * **`npm` is `total / minutes`, not `correct / minutes`** -- the rate is how
 * fast the player answered, and accuracy is reported separately. Both are
 * `Math.round`ed. Getting this backwards would silently deflate every saved
 * score, so it is asserted with a wrong answer in the mix.
 */

const DEFAULTS: GameSettings = {
	gameMode: GameMode.Time,
	timeLimit: 30,
	noteLimit: 25,
	scale: "C Major",
	octave: 4,
	clef: "treble",
	lowNote: "C4",
	highNote: "C6",
};

function makeEngine(
	settings: Partial<GameSettings> = {},
	hooks: {
		onGameEnd?: (stats: GameStats) => void;
		onGameStart?: () => void;
		onCorrectAnswer?: (answer: string) => void;
	} = {},
) {
	return new IdentificationGameEngine<GameSettings>({
		defaultSettings: { ...DEFAULTS, ...settings },
		statsExtras: (s) => ({ scale: s.scale }),
		...hooks,
	});
}

/** Answers `notes`, advancing the clock `msEach` between each. */
function play(
	engine: IdentificationGameEngine<GameSettings>,
	notes: readonly (readonly [shown: string, guess: string])[],
	msEach = 1000,
): void {
	for (const [shown, guess] of notes) {
		engine.syncCurrentAnswer(shown);
		vi.advanceTimersByTime(msEach);
		engine.handleAnswer(guess);
	}
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-08-20T12:00:00Z"));
});

afterEach(() => vi.useRealTimers());

describe("state machine", () => {
	it("starts Ready and moves to Playing on the first answer", () => {
		const onGameStart = vi.fn();
		const engine = makeEngine({}, { onGameStart });

		expect(engine.gameState()).toBe(GameState.Ready);
		expect(engine.isAcceptingAnswers()).toBe(true);

		engine.syncCurrentAnswer("C");
		engine.handleAnswer("C");

		expect(engine.gameState()).toBe(GameState.Playing);
		expect(onGameStart).toHaveBeenCalledTimes(1);
	});

	it("calls onGameStart once, not on every answer", () => {
		const onGameStart = vi.fn();
		const engine = makeEngine({}, { onGameStart });

		play(engine, [
			["C", "C"],
			["D", "D"],
			["E", "E"],
		]);

		expect(onGameStart).toHaveBeenCalledTimes(1);
	});

	it("records each answer against the note that was on the staff", () => {
		const engine = makeEngine();

		play(
			engine,
			[
				["C", "C"],
				["D", "E"],
			],
			1500,
		);

		expect(engine.answers()).toEqual([
			{ note: "C", correct: true, timeToAnswer: 1500 },
			{ note: "D", correct: false, timeToAnswer: 1500 },
		]);
	});

	it("treats a question with no start time as starting now", () => {
		const engine = makeEngine();
		// No syncCurrentAnswer: questionStartTime is still 0.
		engine.handleAnswer("C");
		expect(engine.answers()[0]?.timeToAnswer).toBe(0);
	});

	it("fires onCorrectAnswer with the shown note, only when right", () => {
		const onCorrectAnswer = vi.fn();
		const engine = makeEngine({}, { onCorrectAnswer });

		play(engine, [
			["Bb", "Bb"],
			["C", "D"],
		]);

		expect(onCorrectAnswer.mock.calls).toEqual([["Bb"]]);
	});

	it("resetGame clears the log and the stats but keeps the settings", () => {
		const engine = makeEngine();
		engine.updateSettings({ scale: "G Major" });
		play(engine, [["C", "C"]]);
		engine.endGame();

		engine.resetGame();

		expect(engine.gameState()).toBe(GameState.Ready);
		expect(engine.answers()).toEqual([]);
		expect(engine.gameStats()).toBeNull();
		expect(engine.settings().scale).toBe("G Major");
	});
});

describe("scoring fixtures (React's arithmetic)", () => {
	/**
	 * The clock starts on the **first answer**, not on page load -- there is
	 * no "start" button. So N answers paced `msEach` apart span `(N-1)`
	 * intervals of play, and that is what the rate divides by.
	 */
	it("10 answers, 8 correct, paced 1200ms -> npm 56, accuracy 80", () => {
		const engine = makeEngine({ gameMode: GameMode.Notes, noteLimit: 10 });
		const rounds = Array.from(
			{ length: 10 },
			(_, i) => ["C", i < 8 ? "C" : "D"] as const,
		);

		// 1200ms each, as the E2E harness paces a human.
		play(engine, rounds, 1200);

		// The notes limit ends the game inside the tenth answer.
		expect(engine.gameState()).toBe(GameState.GameOver);
		expect(engine.gameStats()).toEqual({
			// 9 intervals x 1200ms = 10.8s = 0.18min; 10 / 0.18 = 55.6 -> 56.
			// The rate counts every answer, right or wrong.
			npm: 56,
			accuracy: 80,
			correct: 8,
			total: 10,
			gameMode: GameMode.Notes,
			limit: 10,
			scale: "C Major",
		});
	});

	it("rounds both the rate and the accuracy", () => {
		const engine = makeEngine({ gameMode: GameMode.Notes, noteLimit: 3 });
		// 3 answers, 2 correct, 1000ms apart -> 2s of play = 0.0333min,
		// 3 / 0.0333 = 90/min exactly; accuracy 66.67 -> 67.
		play(engine, [
			["C", "C"],
			["D", "D"],
			["E", "F"],
		]);

		expect(engine.gameStats()?.accuracy).toBe(67);
		expect(engine.gameStats()?.npm).toBe(90);
	});

	it("times the game from the first answer, not from the first question", () => {
		const engine = makeEngine();

		// A long look at the first note before answering must not count as
		// play time -- React set gameStartTime inside that first answer.
		engine.syncCurrentAnswer("C");
		vi.advanceTimersByTime(60_000);
		engine.handleAnswer("C");

		engine.syncCurrentAnswer("D");
		vi.advanceTimersByTime(1_000);
		engine.handleAnswer("D");
		engine.endGame();

		// 1s of play, 2 answers -> 120/min, not 2 answers in 61s.
		expect(engine.gameStats()?.npm).toBe(120);
	});

	it("scores zero for a game with no answers at all", () => {
		const engine = makeEngine();
		engine.endGame();

		expect(engine.gameStats()).toEqual({
			npm: 0,
			accuracy: 0,
			correct: 0,
			total: 0,
			gameMode: GameMode.Time,
			limit: 30,
			scale: "C Major",
		});
	});

	it("reports the time limit in time mode and the note limit in notes mode", () => {
		const timed = makeEngine({ gameMode: GameMode.Time, timeLimit: 60 });
		play(timed, [["C", "C"]]);
		timed.endGame();
		expect(timed.gameStats()?.limit).toBe(60);

		const counted = makeEngine({ gameMode: GameMode.Notes, noteLimit: 50 });
		play(counted, [["C", "C"]]);
		counted.endGame();
		expect(counted.gameStats()?.limit).toBe(50);
	});

	it("carries statsExtras -- the note game's scale -- into the summary", () => {
		const engine = makeEngine({ scale: "Eb Major" });
		play(engine, [["C", "C"]]);
		engine.endGame();

		expect(engine.gameStats()).toMatchObject({ scale: "Eb Major" });
	});

	it("does not end a notes-mode game before its limit", () => {
		const engine = makeEngine({ gameMode: GameMode.Notes, noteLimit: 3 });
		play(engine, [
			["C", "C"],
			["D", "D"],
		]);
		expect(engine.gameState()).toBe(GameState.Playing);
		expect(engine.gameStats()).toBeNull();
	});

	it("never ends a time-mode game on the answer count", () => {
		const engine = makeEngine({ gameMode: GameMode.Time, noteLimit: 2 });
		play(engine, [
			["C", "C"],
			["D", "D"],
			["E", "E"],
		]);
		expect(engine.gameState()).toBe(GameState.Playing);
	});
});

describe("save-once", () => {
	it("calls onGameEnd exactly once however many times endGame is called", () => {
		const onGameEnd = vi.fn();
		const engine = makeEngine({}, { onGameEnd });

		play(engine, [["C", "C"]]);
		engine.endGame();
		// The timer expiring on top of a finished game, twice over.
		engine.endGame();
		engine.endGame();

		expect(onGameEnd).toHaveBeenCalledTimes(1);
	});

	it("does not double-save when the notes limit and the timer coincide", () => {
		const onGameEnd = vi.fn();
		const engine = makeEngine(
			{ gameMode: GameMode.Notes, noteLimit: 2 },
			{ onGameEnd },
		);

		play(engine, [
			["C", "C"],
			["D", "D"],
		]);
		// handleAnswer already ended it; this is the countdown firing too.
		engine.endGame();

		expect(onGameEnd).toHaveBeenCalledTimes(1);
		expect(onGameEnd.mock.calls[0]?.[0].total).toBe(2);
	});

	it("ignores answers that arrive after game over", () => {
		const onGameEnd = vi.fn();
		const engine = makeEngine({}, { onGameEnd });

		play(engine, [["C", "C"]]);
		engine.endGame();
		engine.handleAnswer("C");

		expect(engine.answers()).toHaveLength(1);
		expect(onGameEnd).toHaveBeenCalledTimes(1);
	});

	it("saves again after Play Again, because that is a new game", () => {
		const onGameEnd = vi.fn();
		const engine = makeEngine({}, { onGameEnd });

		play(engine, [["C", "C"]]);
		engine.endGame();
		engine.resetGame();
		play(engine, [["D", "D"]]);
		engine.endGame();

		expect(onGameEnd).toHaveBeenCalledTimes(2);
	});
});
