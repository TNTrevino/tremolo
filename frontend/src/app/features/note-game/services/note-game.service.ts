import {
	computed,
	inject,
	Injectable,
	signal,
	type Signal,
} from "@angular/core";
import { Subject } from "rxjs";

import type { GameStats } from "@features/identification-game/data";
import { GameStateService } from "@features/identification-game";

import { notesEquivalent } from "../../../shared/utils/pitch";
import { buildKeyToNoteMap, buildOverlapKeyToNoteMap } from "../models/keymap";
import {
	NOTE_GAME_DEFAULTS,
	type GameSettings,
	type NoteGameStats,
} from "../models/note-game.models";
import { noteKeyboardInput } from "./keyboard-input";
import { NoteAudioService } from "./note-audio.service";

/**
 * The note game. Port of
 * frontend-react/src/features/note-game/hooks/useNoteGame.ts.
 *
 * **This is the composition `frontend/CLAUDE.md` requires**: the state
 * machine, the answer log and the scoring all live in Phase 5's
 * `GameStateService` -- the same engine the four identification games run on
 * -- and this class adds only the note game's three extras: its settings,
 * marimba feedback on a correct answer, and physical keyboard input. There is
 * no second state machine here; every method below either forwards to the
 * engine or configures it.
 *
 * **The settings live here rather than in the engine**, which is Phase 5's
 * deviation 4: `GameStateService` reads only `gameMode` and the two limits,
 * so keeping the game-specific fields outside is what lets it stay
 * non-generic and be shared by five games without a generic-DI cast. The
 * note game's own `scale` reaches the final stats through `statsExtras`,
 * exactly where React put it.
 *
 * React's `onGameEnd` / `onGameStart` callback props become `ended` /
 * `started` observables. The page subscribes with `takeUntilDestroyed`, and
 * because `Subject.next` is synchronous, `started` still fires *inside* the
 * first answer -- which is what lets the page start the timer and persist
 * the settings the player is about to play with.
 *
 * Provided per page, alongside the `GameStateService` it configures.
 */
@Injectable()
export class NoteGameService {
	private readonly audio = inject(NoteAudioService);
	private readonly engine = inject(GameStateService);

	/**
	 * The player's saved note-to-key map, or `undefined` for the defaults.
	 * The page sets it once the bindings resource resolves.
	 */
	readonly keyBindings = signal<Record<string, string> | undefined>(undefined);

	/**
	 * The player's `overlap_accidentals` flag, set by the page from the same
	 * resource as `keyBindings`. On, the keyboard becomes piano-shaped and a
	 * guess is judged by pitch instead of by spelling -- the two halves of
	 * one setting, so they live next to each other.
	 */
	readonly overlapAccidentals = signal(false);

	/**
	 * Suppresses keyboard input without ending the game -- set while the
	 * bindings dialog is capturing keys, so rebinding "C" does not also
	 * answer "C".
	 */
	readonly inputDisabled = signal(false);

	private readonly _started = new Subject<void>();
	private readonly _ended = new Subject<GameStats>();

	/** Fires inside the first answer, before the answer is recorded. */
	readonly started = this._started.asObservable();
	/** Fires once per game, with the final stats. */
	readonly ended = this._ended.asObservable();

	private readonly _settings = signal<GameSettings>(NOTE_GAME_DEFAULTS);
	readonly settings = this._settings.asReadonly();

	readonly gameState = this.engine.state;
	readonly currentNote = this.engine.currentAnswer;
	readonly answers = this.engine.answers;

	/**
	 * The engine types its stats game-agnostically; `statsExtras` below is
	 * what adds `scale`.
	 */
	readonly gameStats: Signal<NoteGameStats | null> = this.engine.stats;

	/**
	 * Key -> note: the default 21-note table, the player's own bindings, or
	 * -- under `overlap_accidentals` -- the twelve piano-shaped keys.
	 */
	readonly keyToNoteMap = computed(() =>
		this.overlapAccidentals()
			? buildOverlapKeyToNoteMap(this.keyBindings())
			: buildKeyToNoteMap(this.keyBindings()),
	);

	constructor() {
		this.engine.configure({
			settings: this._settings,
			onGameStart: () => this._started.next(),
			onGameEnd: (stats) => this._ended.next(stats),
			onCorrectAnswer: (note) => this.audio.playNoteSound(note),
			// The engine's one game-specific comparison, and the only caller
			// of the hook. With the flag off this is exactly the strict
			// equality the engine defaults to, which is why the four
			// identification games are untouched by the overlap layout.
			isCorrect: (guess, answer) =>
				this.overlapAccidentals()
					? notesEquivalent(guess, answer)
					: guess === answer,
			// `octave` is legacy persistence-only and the range is what the
			// game actually uses, so the summary reports the scale alone.
			statsExtras: () => ({ scale: this._settings().scale }),
		});

		// React's twelve `useSound` calls preloaded at hook mount.
		this.audio.preload();

		noteKeyboardInput({
			enabled: computed(
				() =>
					!this.inputDisabled() &&
					(this.engine.isPlaying() || this.engine.isReady()),
			),
			keyMap: this.keyToNoteMap,
			onNote: (note) => this.engine.answer(note),
		});
	}

	updateSettings(patch: Partial<GameSettings>): void {
		this._settings.update((prev) => ({ ...prev, ...patch }));
	}

	handleAnswer(answer: string): void {
		this.engine.answer(answer);
	}

	endGame(): void {
		this.engine.endGame();
	}

	resetGame(): void {
		this.engine.reset();
	}

	/** React's `syncCurrentNote`: the board reporting what it just drew. */
	syncCurrentNote(noteName: string): void {
		this.engine.syncCurrentAnswer(noteName);
	}
}
