import {
	computed,
	inject,
	Injectable,
	signal,
	type Signal,
} from "@angular/core";
import { Subject } from "rxjs";

import type { GameStats, NoteAnswer } from "../models/engine.models";
import { GameMode } from "../models/engine.models";
import { buildKeyToNoteMap } from "../models/keymap";
import type { GameSettings, NoteGameStats } from "../models/note-game.models";
import { DEFAULT_RANGE } from "../models/range.utils";
import { IdentificationGameEngine } from "./identification-game.engine";
import { noteKeyboardInput } from "./keyboard-input";
import { NoteAudioService } from "./note-audio.service";

/**
 * The note game. Port of
 * frontend-react/src/features/note-game/hooks/useNoteGame.ts.
 *
 * **This is the composition `frontend/CLAUDE.md` requires**: the state
 * machine, the answer log and the scoring all live in
 * `IdentificationGameEngine` (the shared engine), and this class adds only
 * the note game's two extras -- marimba feedback on a correct answer, and
 * physical keyboard input. There is no second state machine here; every
 * method below either forwards to the engine or configures it.
 *
 * The engine is a Phase-5 stand-in built to Phase 5's interface (see
 * `identification-game.engine.ts`). When the two branches merge, the only
 * line in this file that changes is the one that constructs it.
 *
 * React's `onGameEnd` / `onGameStart` callback props become `ended` /
 * `started` observables. The page subscribes with `takeUntilDestroyed`, and
 * because `Subject.next` is synchronous, `started` still fires *inside* the
 * first answer -- which is what lets the page start the timer and persist
 * the settings the player is about to play with.
 */
@Injectable()
export class NoteGameService {
	private readonly audio = inject(NoteAudioService);

	/**
	 * The player's saved note-to-key map, or `undefined` for the defaults.
	 * The page sets it once the bindings resource resolves.
	 */
	readonly keyBindings = signal<Record<string, string> | undefined>(undefined);

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

	private readonly engine = new IdentificationGameEngine<GameSettings>({
		defaultSettings: {
			gameMode: GameMode.Time,
			timeLimit: 30,
			noteLimit: 25,
			scale: "C Major",
			// Legacy persistence; the range is what plays. See GameSettings.
			octave: 4,
			clef: "treble",
			lowNote: DEFAULT_RANGE.treble.low,
			highNote: DEFAULT_RANGE.treble.high,
		},
		onGameStart: () => this._started.next(),
		onGameEnd: (stats) => this._ended.next(stats),
		onCorrectAnswer: (note) => this.audio.playNoteSound(note),
		// `octave` is legacy persistence-only and the range is what the game
		// actually uses, so the summary reports the scale alone.
		statsExtras: (settings) => ({ scale: settings.scale }),
	});

	readonly gameState = this.engine.gameState;
	readonly currentNote = this.engine.currentAnswer;
	readonly answers: Signal<NoteAnswer[]> = this.engine.answers;
	readonly settings = this.engine.settings;
	readonly questionStartTime = this.engine.questionStartTime;
	readonly gameStartTime = this.engine.gameStartTime;

	/**
	 * The engine types its stats generically; `statsExtras` above is what
	 * adds `scale`.
	 */
	readonly gameStats: Signal<NoteGameStats | null> = this.engine.gameStats;

	/** Key -> note, from the saved bindings or the default 21-note table. */
	readonly keyToNoteMap = computed(() => buildKeyToNoteMap(this.keyBindings()));

	constructor() {
		// React's twelve `useSound` calls preloaded at hook mount.
		this.audio.preload();

		noteKeyboardInput({
			enabled: computed(
				() => !this.inputDisabled() && this.engine.isAcceptingAnswers(),
			),
			keyMap: this.keyToNoteMap,
			onNote: (note) => this.engine.handleAnswer(note),
		});
	}

	updateSettings(patch: Partial<GameSettings>): void {
		this.engine.updateSettings(patch);
	}

	handleAnswer(answer: string): void {
		this.engine.handleAnswer(answer);
	}

	endGame(): void {
		this.engine.endGame();
	}

	resetGame(): void {
		this.engine.resetGame();
	}

	/** React's `syncCurrentNote`: the board reporting what it just drew. */
	syncCurrentNote(noteName: string): void {
		this.engine.syncCurrentAnswer(noteName);
	}
}
