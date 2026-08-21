import { computed, Injectable, signal, type Signal } from "@angular/core";

import {
	GameMode,
	GameState,
	type BaseGameSettings,
	type GameStats,
	type NoteAnswer,
} from "../models/game-state.models";

export interface GameStateConfig {
	/**
	 * The live settings. Read only for `gameMode` and the two limits, which
	 * is why this service is not generic: everything game-specific reaches
	 * it through `statsExtras`.
	 */
	settings: Signal<BaseGameSettings>;
	/** Fires on the first answer, which is what starts the game. */
	onGameStart?: () => void;
	onGameEnd?: (stats: GameStats) => void;
	/** Called with the correct answer when the player gets one right. */
	onCorrectAnswer?: (answer: string) => void;
	/**
	 * Game-specific fields merged into `GameStats` (the note game's scale,
	 * for instance). The shared `GameStats` stays game-agnostic.
	 */
	statsExtras?: () => Record<string, unknown>;
}

/**
 * The Ready -> Playing -> GameOver machine, the answer log, per-question
 * timing, and the final score.
 *
 * Port of
 * frontend-react/src/features/identification-game/hooks/useIdentificationGame.ts.
 * The question itself lives outside: the board renders it and calls
 * `syncCurrentAnswer` with the answer that *is* correct, and `answer()`
 * compares the player's guess against that.
 *
 * **`endGame`'s arithmetic is ported exactly** -- it is the score users see
 * and the number that reaches `note_game_entries`. `game-state.service.spec.ts`
 * pins it against fixtures.
 *
 * Two things differ from the hook, both recorded in the handoff:
 *
 * 1. **Settings live in the page, not here.** The hook owned them because
 *    that is how hooks compose; the page needs them anyway for `toRequest`,
 *    `answerOptions` and `prompt`, and keeping them there is what lets this
 *    service stay non-generic and be reused by Phase 6 unchanged.
 * 2. **`endGame` is idempotent.** React had no guard: it relied on the
 *    timer's ref-mirroring to make sure expiry fired once, and on the
 *    questions-mode branch and the timer never both firing. The guard is
 *    one line and makes "the score saves exactly once" a property of the
 *    machine rather than of the timer's internals.
 *
 * Provided per game page: this is that page's state.
 */
@Injectable()
export class GameStateService {
	private config: GameStateConfig | null = null;

	private readonly _state = signal<GameState>(GameState.Ready);
	private readonly _currentAnswer = signal("");
	private readonly _answers = signal<NoteAnswer[]>([]);
	private readonly _stats = signal<GameStats | null>(null);

	private gameStartTime = 0;
	private questionStartTime = 0;

	readonly state = this._state.asReadonly();
	/** The answer that is correct for the question on screen. */
	readonly currentAnswer = this._currentAnswer.asReadonly();
	readonly answers = this._answers.asReadonly();
	readonly stats = this._stats.asReadonly();

	readonly isPlaying = computed(() => this._state() === GameState.Playing);
	readonly isReady = computed(() => this._state() === GameState.Ready);
	readonly isGameOver = computed(() => this._state() === GameState.GameOver);

	/** Call once, from the page's constructor. */
	configure(config: GameStateConfig): void {
		this.config = config;
	}

	/**
	 * Records a guess. The **first** answer is what starts the game: it
	 * moves to Playing, stamps the start time and fires `onGameStart`, which
	 * is where the page starts the countdown and persists the settings the
	 * player is about to play with.
	 */
	answer(guess: string): void {
		const config = this.require();
		const settings = config.settings();

		if (this._state() === GameState.Ready) {
			this._state.set(GameState.Playing);
			this.gameStartTime = Date.now();
			config.onGameStart?.();
		}

		const effectiveQuestionStart =
			this.questionStartTime === 0 ? Date.now() : this.questionStartTime;
		const timeToAnswer = Date.now() - effectiveQuestionStart;
		const correctAnswer = this._currentAnswer();
		const correct = guess === correctAnswer;

		const answers = [
			...this._answers(),
			{ note: correctAnswer, correct, timeToAnswer },
		];
		this._answers.set(answers);

		if (correct) config.onCorrectAnswer?.(correctAnswer);

		// The board loads the next question when the answer count changes;
		// nothing is fetched here.
		if (
			settings.gameMode === GameMode.Notes &&
			answers.length >= settings.noteLimit
		) {
			this.endGame(answers);
		}
	}

	/**
	 * Reports the correct answer for a freshly displayed question, and
	 * restarts that question's clock.
	 */
	syncCurrentAnswer(answer: string): void {
		this._currentAnswer.set(answer);
		this.questionStartTime = Date.now();
	}

	/**
	 * Ends the game and computes the score.
	 *
	 * The arithmetic is React's `endGame`, line for line. Calling it twice
	 * is a no-op, so a timer that expires on the same tick as the last
	 * answer cannot save two entries.
	 */
	endGame(finalAnswers?: NoteAnswer[]): void {
		if (this._state() === GameState.GameOver) return;

		const config = this.require();
		const settings = config.settings();
		const gameAnswers = finalAnswers ?? this._answers();

		const correct = gameAnswers.filter((a) => a.correct).length;
		const total = gameAnswers.length;
		const accuracy = total > 0 ? (correct / total) * 100 : 0;
		const timeElapsed = (Date.now() - this.gameStartTime) / 1000 / 60;
		const npm = total > 0 && timeElapsed > 0 ? total / timeElapsed : 0;

		const stats: GameStats = {
			npm: Math.round(npm),
			accuracy: Math.round(accuracy),
			correct,
			total,
			gameMode: settings.gameMode,
			limit:
				settings.gameMode === GameMode.Time
					? settings.timeLimit
					: settings.noteLimit,
			...config.statsExtras?.(),
		};

		this._stats.set(stats);
		this._state.set(GameState.GameOver);

		config.onGameEnd?.(stats);
	}

	/** Back to Ready with an empty log. Settings and the queue survive. */
	reset(): void {
		this._state.set(GameState.Ready);
		this._stats.set(null);
		this._answers.set([]);
		this.gameStartTime = 0;
		this.questionStartTime = 0;
	}

	private require(): GameStateConfig {
		if (!this.config) {
			throw new Error("GameStateService.configure() was never called");
		}
		return this.config;
	}
}
