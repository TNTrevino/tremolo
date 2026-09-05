import { Injectable, signal, type OnDestroy } from "@angular/core";

import {
	BEATS_PER_BAR,
	COUNT_IN_BEATS,
	DEFAULT_NOTE_STREAM_SETTINGS,
} from "../models/note-stream.models";

/**
 * The single clock of the note stream game: the scroll, the metronome and
 * every timing judgment read their beat from here.
 *
 * **`performance.now()` is the master timeline, not `AudioContext`.** The
 * design record names the audio clock, but the thing being judged is a
 * `keydown`, and a keydown arrives stamped with a `DOMHighResTimeStamp` on
 * the `performance.now()` origin -- `event.timeStamp`, which
 * `noteKeyboardInput` now forwards. Judging on that timeline means the
 * comparison is stamp-to-stamp with nothing in between; judging on the audio
 * clock would mean converting every press through a sampled offset for no
 * gain. The audio clock is still used where it is the only correct one:
 * *scheduling* the metronome, which is why the offset between the two is
 * sampled once at `start()`.
 *
 * **Timekeeping is an origin, not an accumulator.** `originMs` is the
 * `performance.now()` instant of beat 0, so the beat is one subtraction and
 * one divide, and `beatToTimeMs`/`timeMsToBeat` are exact inverses. Pausing
 * does not accumulate elapsed beats; it freezes the beat and, on resume,
 * slides the origin forward by however long the game stood still. Nothing
 * drifts and nothing has to be re-derived.
 *
 * **Count-ins.** `start()` opens the clock at `-COUNT_IN_BEATS` and lets it
 * run: the count-in is four clicks of empty bars while the first notes are
 * already scrolling in from the right edge, which is what makes the first
 * note playable. `resume()` is the other kind -- Guitar Hero's unpause
 * countdown -- where the beat stays **frozen** for four clicks so the
 * scroll picks up exactly where it stopped instead of jumping. Both raise
 * `countingIn`.
 *
 * **Audio is optional.** The context is created lazily inside `start()`, so
 * it is created inside the start button's gesture. jsdom has no
 * `AudioContext` at all, and a browser may refuse to construct one; either
 * way the transport runs silently and every other behaviour here is
 * unchanged. That is `NoteAudioService`'s pattern, for the same reason.
 *
 * Provided per page, alongside the rest of the stream engine.
 */

/** How often the lookahead scheduler wakes up. */
const SCHEDULER_INTERVAL_MS = 25;

/** How far ahead of the wall clock clicks are handed to the audio thread. */
const SCHEDULE_AHEAD_MS = 120;

/** Length of one metronome blip. */
const CLICK_SECONDS = 0.006;

const CLICK_HZ = { accent: 1600, plain: 1000 };
const CLICK_GAIN = { accent: 0.35, plain: 0.2 };

@Injectable()
export class StreamTransportService implements OnDestroy {
	/**
	 * The wall clock, injectable so a spec can drive beats by hand. Every
	 * read of "now" in this file goes through it.
	 */
	now: () => number = () => performance.now();

	private readonly _running = signal(false);
	private readonly _countingIn = signal(false);

	/** True between `start()` and `stop()`, and false while paused. */
	readonly running = this._running.asReadonly();
	/** True while either kind of count-in is playing its four clicks. */
	readonly countingIn = this._countingIn.asReadonly();

	private _bpm = DEFAULT_NOTE_STREAM_SETTINGS.tempoBpm;

	get bpm(): number {
		return this._bpm;
	}

	get msPerBeat(): number {
		return 60_000 / this._bpm;
	}

	/** The `performance.now()` instant of beat 0. */
	private originMs = 0;

	/**
	 * Where the beat stands while the clock is frozen -- before the first
	 * `start()`, while paused, during a resume count-in, and after `stop()`.
	 * `null` means the beat is running off `now()`.
	 */
	private frozenBeat: number | null = 0;

	/** True between `start()` and `stop()`, pause included -- unlike `running`. */
	private active = false;

	private ctx: AudioContext | null = null;
	/** The `(performance.now(), ctx.currentTime)` pair sampled at `start()`. */
	private clockPairing = { perfMs: 0, ctxSeconds: 0 };

	private schedulerId: ReturnType<typeof setInterval> | null = null;
	private countInId: ReturnType<typeof setTimeout> | null = null;
	private nextClickBeat = 0;

	/** Beat -> the `performance.now()` ms it falls on. */
	beatToTimeMs(beat: number): number {
		return this.originMs + beat * this.msPerBeat;
	}

	/** A `performance.now()` ms -- an `event.timeStamp` -- as a beat. */
	timeMsToBeat(ms: number): number {
		return (ms - this.originMs) / this.msPerBeat;
	}

	/**
	 * The beat right now. A plain method rather than a signal: the staff
	 * reads it from a `requestAnimationFrame` loop every frame, where a
	 * signal would only add change-detection churn to a value that is
	 * different every time it is read.
	 */
	currentBeat(): number {
		return this.frozenBeat ?? this.timeMsToBeat(this.now());
	}

	/**
	 * Opens the clock at `-COUNT_IN_BEATS` and starts the metronome. Call it
	 * from a user gesture: this is where the `AudioContext` is born.
	 */
	start(bpm: number): void {
		this.stopTimers();

		this._bpm = bpm;
		this.active = true;
		this.frozenBeat = null;
		this.originMs = this.now() + COUNT_IN_BEATS * this.msPerBeat;
		this.nextClickBeat = -COUNT_IN_BEATS;

		this._running.set(true);
		this._countingIn.set(true);
		this.countInId = setTimeout(
			() => this._countingIn.set(false),
			COUNT_IN_BEATS * this.msPerBeat,
		);

		this.openAudio();
		this.schedulerId = setInterval(
			() => this.scheduleDueClicks(),
			SCHEDULER_INTERVAL_MS,
		);
		this.scheduleDueClicks();
	}

	/** Freezes the beat where it stands. Silent until `resume()`. */
	pause(): void {
		if (!this._running()) return;

		this.frozenBeat = this.currentBeat();
		this._running.set(false);
		this._countingIn.set(false);
		this.clearCountIn();
	}

	/**
	 * Guitar Hero's unpause: four clicks with the scroll held still, then
	 * the beat carries on from exactly where it stopped.
	 *
	 * The origin is slid forward *now*, to the instant the count-in will
	 * end, so `beatToTimeMs` is already correct for every note on screen by
	 * the time anything can be judged. `frozenBeat` is what keeps the scroll
	 * from jumping in the meantime.
	 */
	resume(): void {
		const frozen = this.frozenBeat;
		if (!this.active || this._running() || frozen === null) return;

		const countInMs = COUNT_IN_BEATS * this.msPerBeat;
		const resumeAtMs = this.now();
		this.originMs = resumeAtMs + countInMs - frozen * this.msPerBeat;
		this.nextClickBeat = Math.ceil(frozen);

		this._running.set(true);
		this._countingIn.set(true);
		this.countInId = setTimeout(() => {
			this._countingIn.set(false);
			this.frozenBeat = null;
		}, countInMs);

		// The count-in clicks cannot come from the lookahead scheduler: it
		// walks the beat grid, and the beat is standing still. Four clicks,
		// straight into audio time, accented on the first -- "and a one".
		for (let i = 0; i < COUNT_IN_BEATS; i++) {
			this.scheduleClick(resumeAtMs + i * this.msPerBeat, i === 0);
		}
	}

	/** Ends the session: metronome off, context closed, beat left where it died. */
	stop(): void {
		this.frozenBeat = this.currentBeat();
		this.active = false;
		this._running.set(false);
		this._countingIn.set(false);
		this.stopTimers();
		this.closeAudio();
	}

	ngOnDestroy(): void {
		this.stop();
	}

	/**
	 * The standard lookahead scheduler: every 25 ms, hand the audio thread
	 * every click that falls inside the next 120 ms. `setInterval` is far
	 * too coarse to click on, but it is plenty to stay ahead of a clock that
	 * is sample-accurate once a note is queued on it.
	 *
	 * It no-ops while the beat is frozen -- a paused game has no upcoming
	 * beats, and a resume count-in schedules its own clicks.
	 */
	private scheduleDueClicks(): void {
		if (!this.ctx || this.frozenBeat !== null) return;

		// A backgrounded tab can leave the scheduler minutes behind; catch
		// up to the present rather than firing a burst of stale clicks.
		this.nextClickBeat = Math.max(
			this.nextClickBeat,
			Math.ceil(this.timeMsToBeat(this.now())),
		);

		const horizonMs = this.now() + SCHEDULE_AHEAD_MS;
		while (this.beatToTimeMs(this.nextClickBeat) < horizonMs) {
			this.scheduleClick(
				this.beatToTimeMs(this.nextClickBeat),
				this.nextClickBeat % BEATS_PER_BAR === 0,
			);
			this.nextClickBeat += 1;
		}
	}

	/** One blip, at a `performance.now()` instant, on the audio clock. */
	private scheduleClick(atMs: number, accent: boolean): void {
		const ctx = this.ctx;
		if (!ctx) return;

		const when = Math.max(this.toAudioTime(atMs), ctx.currentTime);
		const oscillator = ctx.createOscillator();
		const gain = ctx.createGain();

		oscillator.frequency.value = accent ? CLICK_HZ.accent : CLICK_HZ.plain;

		// A square-edged blip clicks in the speaker; a 1 ms attack and an
		// exponential tail is the shortest envelope that still reads as a
		// metronome rather than a pop.
		const peak = accent ? CLICK_GAIN.accent : CLICK_GAIN.plain;
		gain.gain.setValueAtTime(0.0001, when);
		gain.gain.exponentialRampToValueAtTime(peak, when + 0.001);
		gain.gain.exponentialRampToValueAtTime(0.0001, when + CLICK_SECONDS);

		oscillator.connect(gain).connect(ctx.destination);
		oscillator.start(when);
		oscillator.stop(when + CLICK_SECONDS);
	}

	/** `performance.now()` ms -> `AudioContext.currentTime` seconds. */
	private toAudioTime(ms: number): number {
		return (
			this.clockPairing.ctxSeconds + (ms - this.clockPairing.perfMs) / 1000
		);
	}

	/**
	 * The context, and the one sample of the offset between the two clocks
	 * everything else converts through. Both clocks run at the same rate, so
	 * one pairing holds for the session.
	 */
	private openAudio(): void {
		if (!this.ctx) {
			if (typeof AudioContext === "undefined") return;
			try {
				this.ctx = new AudioContext();
			} catch {
				// No metronome. The game is still perfectly playable.
				this.ctx = null;
				return;
			}
		}

		// A context inherited from a backgrounded tab can be suspended.
		if (this.ctx.state === "suspended") void this.ctx.resume();

		this.clockPairing = {
			perfMs: this.now(),
			ctxSeconds: this.ctx.currentTime,
		};
	}

	private closeAudio(): void {
		const ctx = this.ctx;
		this.ctx = null;
		void ctx?.close().catch(() => undefined);
	}

	private stopTimers(): void {
		if (this.schedulerId !== null) clearInterval(this.schedulerId);
		this.schedulerId = null;
		this.clearCountIn();
	}

	private clearCountIn(): void {
		if (this.countInId !== null) clearTimeout(this.countInId);
		this.countInId = null;
	}
}
