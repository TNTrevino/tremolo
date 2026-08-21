import { computed, signal, type Signal } from "@angular/core";

import type {
	BaseGameSettings,
	GameStats,
	NoteAnswer,
} from "../models/engine.models";
import { GameMode, GameState } from "../models/engine.models";

/**
 * PHASE-5 SEAM. Port of
 * frontend-react/src/features/identification-game/hooks/useIdentificationGame.ts.
 *
 * The generic engine for staff identification games: it owns the
 * Ready -> Playing -> GameOver state machine, the answer log, the scoring and
 * the per-question timing. The question itself lives outside -- the board
 * fetches questions and calls `syncCurrentAnswer` with the correct answer for
 * whatever is on the staff; `handleAnswer` compares the guess against it.
 *
 * **This file is the engine, not the note game.** `frontend/CLAUDE.md` says
 * the note game *composes* the engine rather than forking a second state
 * machine, and it still does: `NoteGameService` layers audio and keyboard
 * input on top of this and adds nothing to the machine itself. Phase 5 owns
 * the engine and was building it in a parallel worktree, so this is a
 * same-semantics stand-in with **one** consumer -- see
 * `.migration/phase-6-handoff.md` §3 for the swap.
 *
 * It is a plain class rather than an `@Injectable`, because it is generic in
 * its settings type and has no dependencies of its own. `NoteGameService`
 * constructs one. If Phase 5's engine is an injected service instead, only
 * `note-game.service.ts` changes.
 */

export interface IdentificationGameOptions<TSettings extends BaseGameSettings> {
	defaultSettings: TSettings;
	onGameEnd?: (stats: GameStats) => void;
	onGameStart?: () => void;
	/** Called with the answer when the player gets a question right. */
	onCorrectAnswer?: (answer: string) => void;
	/**
	 * Game-specific fields merged into `GameStats` (e.g. the note game's
	 * scale). Declare their types on the game's own stats extension -- the
	 * shared `GameStats` stays game-agnostic.
	 */
	statsExtras?: (settings: TSettings) => Record<string, unknown>;
}

export class IdentificationGameEngine<TSettings extends BaseGameSettings> {
	private readonly _settings: ReturnType<typeof signal<TSettings>>;
	private readonly _gameState = signal<GameState>(GameState.Ready);
	private readonly _currentAnswer = signal("");
	private readonly _answers = signal<NoteAnswer[]>([]);
	private readonly _gameStartTime = signal(0);
	private readonly _questionStartTime = signal(0);
	private readonly _gameStats = signal<GameStats | null>(null);

	readonly settings: Signal<TSettings>;
	readonly gameState = this._gameState.asReadonly();
	readonly currentAnswer = this._currentAnswer.asReadonly();
	readonly answers = this._answers.asReadonly();
	readonly gameStartTime = this._gameStartTime.asReadonly();
	readonly questionStartTime = this._questionStartTime.asReadonly();
	readonly gameStats = this._gameStats.asReadonly();

	/** True while the player may answer -- what gates keyboard input. */
	readonly isAcceptingAnswers = computed(
		() =>
			this._gameState() === GameState.Playing ||
			this._gameState() === GameState.Ready,
	);

	constructor(private readonly options: IdentificationGameOptions<TSettings>) {
		this._settings = signal<TSettings>(options.defaultSettings);
		this.settings = this._settings.asReadonly();
	}

	updateSettings(patch: Partial<TSettings>): void {
		this._settings.update((prev) => ({ ...prev, ...patch }));
	}

	/**
	 * Handle an answer. The first answer in `Ready` starts the game -- there
	 * is no separate "start" button, which is why `onGameStart` is where the
	 * timer starts and the settings are persisted.
	 */
	handleAnswer(answer: string): void {
		if (this._gameState() === GameState.GameOver) return;

		if (this._gameState() === GameState.Ready) {
			this._gameState.set(GameState.Playing);
			this._gameStartTime.set(Date.now());
			this.options.onGameStart?.();
		}

		// A question that arrived before the game started has no start time
		// yet; React treated that as "now" so the first answer is not credited
		// with the whole page load.
		const questionStart = this._questionStartTime();
		const effectiveStart = questionStart === 0 ? Date.now() : questionStart;

		const currentAnswer = this._currentAnswer();
		const correct = answer === currentAnswer;

		const newAnswers = [
			...this._answers(),
			{
				note: currentAnswer,
				correct,
				timeToAnswer: Date.now() - effectiveStart,
			},
		];
		this._answers.set(newAnswers);

		if (correct) this.options.onCorrectAnswer?.(currentAnswer);

		// Notes mode ends here. No new question is generated: the board loads
		// the next one when the answer count changes.
		const settings = this._settings();
		if (
			settings.gameMode === GameMode.Notes &&
			newAnswers.length >= settings.noteLimit
		) {
			this.endGame(newAnswers);
		}
	}

	/**
	 * Ends the game and computes the stats React computed.
	 *
	 * **Idempotent, and that is load-bearing.** `onGameEnd` is what saves the
	 * score, so a second call would post a second entry. React relied on
	 * nothing calling it twice (its timer stops itself on expiry, and its
	 * keyboard listener is disabled once the results screen is up) and its
	 * `useGameTimer` carries a comment about a StrictMode double-invoke that
	 * *did* save duplicates once. Making the guard structural costs nothing
	 * and is what `save-once` is pinned on.
	 */
	endGame(finalAnswers?: NoteAnswer[]): void {
		if (this._gameState() === GameState.GameOver) return;

		const settings = this._settings();
		const gameAnswers = finalAnswers ?? this._answers();
		const correct = gameAnswers.filter((a) => a.correct).length;
		const total = gameAnswers.length;
		const accuracy = total > 0 ? (correct / total) * 100 : 0;
		// Minutes elapsed since the first answer.
		const timeElapsed = (Date.now() - this._gameStartTime()) / 1000 / 60;
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
			...this.options.statsExtras?.(settings),
		};

		this._gameStats.set(stats);
		this._gameState.set(GameState.GameOver);
		this.options.onGameEnd?.(stats);
	}

	/**
	 * Sync the expected answer with the backend-generated question. Called
	 * when the board displays a question, so answer validation compares
	 * against what is actually on the staff.
	 */
	syncCurrentAnswer(answer: string): void {
		this._currentAnswer.set(answer);
		this._questionStartTime.set(Date.now());
	}

	/** Back to Ready. Settings survive; the answer log and stats do not. */
	resetGame(): void {
		this._gameState.set(GameState.Ready);
		this._gameStats.set(null);
		this._answers.set([]);
	}
}
