import { computed, inject, Injectable, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

import { GameTimerService } from "@features/identification-game";
import {
	buildKeyToNoteMap,
	buildOverlapKeyToNoteMap,
} from "@features/note-game/models/keymap";
import { noteKeyboardInput } from "@features/note-game/services/keyboard-input";
import { NoteAudioService } from "@features/note-game/services/note-audio.service";

import {
	DEFAULT_NOTE_STREAM_SETTINGS,
	type NoteStreamSettings,
	type StreamPhase,
} from "../models/note-stream.models";
import { NoteSpawnerService } from "./note-spawner.service";
import { StreamScoreService } from "./stream-score.service";
import { StreamTransportService } from "./stream-transport.service";

/**
 * The note stream game. The composition root, in the shape
 * `NoteGameService` set: settings, audio and physical keyboard input live
 * here, and everything else is forwarded to a service that does one job --
 * the clock, the note supply, the scoring, the session countdown.
 *
 * **It does not compose `GameStateService`**, and that is the one place this
 * game departs from every other game in the app. That engine's contract is
 * one static question and one string answer (`answer(guess) -> boolean`);
 * a hit here is a pitch *and* an offset in milliseconds, and there is no
 * question to be right about, only a moment to be on time for. The design
 * record settles it. What is genuinely shared is shared for real:
 * `noteKeyboardInput`, the saved key bindings, `NoteAudioService`, and
 * `GameTimerService` for the session countdown.
 *
 * **The clock does not tick itself.** `tick(nowMs)` is called from the
 * staff's `requestAnimationFrame` loop, which is the only loop the game
 * needs and is already running to move the notes. A second timer here would
 * be a second source of truth about when a note expired, and the two would
 * disagree in a backgrounded tab.
 *
 * **The session countdown starts when play does, not when the count-in
 * does.** Four beats at 30 BPM is eight seconds; charging that to a 30
 * second session would take a quarter of it before the first note.
 *
 * Provided per page, with the four services it wires together.
 */

/**
 * Beats a judged note keeps drawing (its hit or miss animation) before it is
 * dropped.
 *
 * Half a beat is 70px at `PIXELS_PER_BEAT`, which lands a note just past the
 * staff's fade-out. Two beats -- what this was -- carried a judged note 280px
 * left of the hit line, to x = -140, straight across the clef. The note was
 * invisible by then only because the fade exists; keeping it in the list any
 * longer just costs a layout per frame.
 */
const PRUNE_AFTER_BEATS = 0.5;

@Injectable()
export class NoteStreamGameService {
	private readonly audio = inject(NoteAudioService);
	private readonly timer = inject(GameTimerService);

	readonly transport = inject(StreamTransportService);
	readonly spawner = inject(NoteSpawnerService);
	readonly score = inject(StreamScoreService);

	/**
	 * The player's saved note-to-key map, or `undefined` for the defaults.
	 * The page sets it once the bindings resource resolves -- the same hand-
	 * off `NoteGameService` uses, because the resource needs the page's
	 * `AuthStore` and its `error()` guard.
	 */
	readonly keyBindings = signal<Record<string, string> | undefined>(undefined);

	/** The bindings' overlap flag, forwarded to the score service. */
	readonly overlapAccidentals = this.score.overlapAccidentals;

	private readonly _settings = signal<NoteStreamSettings>(
		DEFAULT_NOTE_STREAM_SETTINGS,
	);
	readonly settings = this._settings.asReadonly();

	private readonly _phase = signal<StreamPhase>("ready");
	readonly phase = this._phase.asReadonly();

	/**
	 * Key -> note, from the saved bindings or the default 21-note table.
	 * In overlap mode the sharps sit fixed on w e t y u and the flats
	 * have no key -- the score service accepts them enharmonically.
	 */
	readonly keyToNoteMap = computed(() =>
		this.overlapAccidentals()
			? buildOverlapKeyToNoteMap(this.keyBindings())
			: buildKeyToNoteMap(this.keyBindings()),
	);

	/** What the staff draws. */
	readonly notes = this.spawner.notes;

	readonly secondsRemaining = this.timer.remaining;
	readonly stats = computed(() => this.score.stats());

	constructor() {
		// React's twelve `useSound` calls preloaded at hook mount; the same
		// eager fetch, so the first hit is not the first network request.
		this.audio.preload();

		this.timer.expired
			.pipe(takeUntilDestroyed())
			.subscribe(() => this.endGame());

		noteKeyboardInput({
			// Not during the count-in: there is nothing in range yet, and a
			// press would only break a streak that has not started.
			enabled: computed(() => this._phase() === "playing"),
			keyMap: this.keyToNoteMap,
			onNote: (note, timeStampMs) => this.onPress(note, timeStampMs),
		});
	}

	updateSettings(patch: Partial<NoteStreamSettings>): void {
		this._settings.update((prev) => ({ ...prev, ...patch }));
	}

	/** Ready -> count-in. Call from the start button: the audio context wants the gesture. */
	startGame(): void {
		const settings = this._settings();

		this.score.reset();
		this.spawner.configure(settings);
		this.timer.reset();

		this._phase.set("countIn");
		this.transport.start(settings.tempoBpm);
		this.spawner.ensureAhead(this.transport.currentBeat());
	}

	/**
	 * One frame of the game loop, driven by the staff's `rAF`.
	 *
	 * `nowMs` is that frame's `performance.now()` timestamp -- the argument
	 * `requestAnimationFrame` already hands its callback, on the same
	 * timeline as the beat grid and as a keydown's `timeStamp`.
	 */
	tick(nowMs: number): void {
		const phase = this._phase();
		if (phase !== "countIn" && phase !== "playing") return;

		const beat = this.transport.currentBeat();
		this.spawner.ensureAhead(beat);

		if (phase === "countIn") {
			if (beat < 0 || this.transport.countingIn()) return;
			this._phase.set("playing");
			this.startCountdown();
		}

		this.score.sweep(nowMs);
		this.pruneFinished(beat);
	}

	pause(): void {
		const phase = this._phase();
		if (phase !== "playing" && phase !== "countIn") return;

		this.transport.pause();
		this.timer.stop();
		this._phase.set("paused");
	}

	/**
	 * Back to a count-in, not straight back to play: the transport holds the
	 * scroll still for four clicks, and `tick` flips to `playing` when it
	 * lets go. The countdown stays stopped for those four beats.
	 */
	resume(): void {
		if (this._phase() !== "paused") return;

		this._phase.set("countIn");
		this.transport.resume();
	}

	endGame(): void {
		this.transport.stop();
		this.timer.stop();
		this._phase.set("finished");
	}

	/** Back to the settings screen, ready for another run. */
	reset(): void {
		this.transport.stop();
		this.timer.reset();
		this.score.reset();
		this.spawner.configure(this._settings());
		this._phase.set("ready");
	}

	/**
	 * A press. The marimba answers a real hit only -- a miss is silent, and
	 * a stray press with nothing in range is not even a miss.
	 */
	private onPress(name: string, timeStampMs: number): void {
		const judged = this.score.judgePress(name, timeStampMs);
		if (judged && judged.judgment !== "miss") this.audio.playNoteSound(name);
	}

	/**
	 * Starts (or picks back up) the session countdown. A resumed game keeps
	 * the seconds it had left; a fresh one gets the whole session, because
	 * `startGame` reset the timer to zero.
	 */
	private startCountdown(): void {
		const remaining = this.timer.remaining();
		this.timer.start(
			remaining > 0 ? remaining : this._settings().sessionSeconds,
		);
	}

	/** Judged notes leave the list once the staff has faded them out. */
	private pruneFinished(beat: number): void {
		const done = this.spawner
			.notes()
			.filter(
				(note) =>
					beat - note.beat > PRUNE_AFTER_BEATS &&
					this.score.judgmentFor(note.id) !== undefined,
			)
			.map((note) => note.id);

		this.spawner.prune(done);
	}
}
