import { TestBed } from "@angular/core/testing";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
	type Mock,
} from "vitest";

import { GameTimerService } from "@features/identification-game";
import { DEFAULT_NOTE_TO_KEY_MAP } from "@features/note-game/models/keymap";
import { NoteAudioService } from "@features/note-game/services/note-audio.service";

import { COUNT_IN_BEATS } from "../models/note-stream.models";
import { NoteSpawnerService } from "./note-spawner.service";
import { NoteStreamGameService } from "./note-stream-game.service";
import { StreamScoreService } from "./stream-score.service";
import { StreamTransportService } from "./stream-transport.service";

/**
 * The composition root, wired the way the page provides it.
 *
 * The clock is faked twice over -- `transport.now` for the beat, vitest's
 * timers for the count-in and the countdown -- and `advance()` moves both,
 * because the phase machine reads one and the session timer runs on the
 * other.
 *
 * Presses go in as real `keydown` events, so the test covers the actual
 * path: `noteKeyboardInput` -> `judgePress` -> the marimba. Their
 * `timeStamp` is overridden, because a real one would be on the wall clock
 * while the transport is on the fake one, and the whole point of forwarding
 * the timestamp is that the two are the same timeline in production.
 */

/** A keydown with a chosen `timeStamp`, which is otherwise read-only. */
function press(key: string, timeStampMs: number): void {
	const event = new KeyboardEvent("keydown", { key, cancelable: true });
	Object.defineProperty(event, "timeStamp", { value: timeStampMs });
	document.dispatchEvent(event);
}

describe("NoteStreamGameService", () => {
	let game: NoteStreamGameService;
	let transport: StreamTransportService;
	let audio: { preload: Mock; playNoteSound: Mock };
	let clockMs: number;

	/** 60 BPM, so a beat is a second and the count-in is four. */
	const COUNT_IN_MS = COUNT_IN_BEATS * 1000;

	beforeEach(() => {
		vi.useFakeTimers();
		clockMs = 0;
		audio = { preload: vi.fn(), playNoteSound: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				NoteStreamGameService,
				StreamTransportService,
				NoteSpawnerService,
				StreamScoreService,
				GameTimerService,
				{ provide: NoteAudioService, useValue: audio },
			],
		});

		transport = TestBed.inject(StreamTransportService);
		transport.now = () => clockMs;

		game = TestBed.inject(NoteStreamGameService);
		// Every note is a C or a D, so a spec can name the key to press.
		game.spawner.random = () => 0;
	});

	afterEach(() => {
		game.endGame();
		vi.useRealTimers();
	});

	/**
	 * Moves both clocks, then runs a frame of the game loop.
	 *
	 * The leading flush is what `game-timer.service.spec.ts` needs too:
	 * `GameTimerService`'s `isRunning` reaches its `interval` through
	 * `toObservable`, which republishes on a change-detection pass -- so a
	 * `stop()` that has not been flushed yet is a countdown that keeps
	 * counting through the next `advanceTimersByTime`.
	 */
	function advance(ms: number): void {
		TestBed.tick();
		clockMs += ms;
		vi.advanceTimersByTime(ms);
		frame();
	}

	/** One `requestAnimationFrame` callback's worth of work. */
	function frame(): void {
		game.tick(clockMs);
		TestBed.tick();
	}

	/** Starts a game and runs the count-in out, leaving it playing. */
	function startPlaying(): void {
		game.startGame();
		advance(COUNT_IN_MS);
	}

	it("preloads the marimba when it is constructed", () => {
		expect(audio.preload).toHaveBeenCalled();
	});

	it("sits in ready with nothing running", () => {
		expect(game.phase()).toBe("ready");
		expect(game.notes()).toEqual([]);
		expect(transport.running()).toBe(false);
	});

	it("starts into the count-in with the stream already spawning", () => {
		game.startGame();

		expect(game.phase()).toBe("countIn");
		expect(transport.running()).toBe(true);
		expect(transport.currentBeat()).toBe(-COUNT_IN_BEATS);
		expect(game.notes().length).toBeGreaterThan(0);
		expect(game.notes()[0]?.beat).toBe(0);
	});

	it("stays in the count-in until the clicks are done", () => {
		game.startGame();
		advance(COUNT_IN_MS - 1);

		expect(game.phase()).toBe("countIn");
		expect(game.secondsRemaining()).toBe(0);
	});

	it("flips to playing and starts the session countdown", () => {
		startPlaying();

		expect(game.phase()).toBe("playing");
		expect(game.secondsRemaining()).toBe(game.settings().sessionSeconds);
	});

	it("scores a hit pressed on the beat, and plays it back", () => {
		startPlaying();
		const first = game.notes()[0];
		const key = DEFAULT_NOTE_TO_KEY_MAP[first?.name ?? ""];

		press(key ?? "a", transport.beatToTimeMs(first?.beat ?? 0));

		expect(game.score.lastJudged()?.judgment).toBe("perfect");
		expect(game.score.score()).toBe(100);
		expect(audio.playNoteSound).toHaveBeenCalledWith(first?.name);
	});

	it("ignores presses during the count-in", () => {
		game.startGame();
		advance(1000);

		press("a", clockMs);

		expect(game.score.lastJudged()).toBeNull();
		expect(game.score.streak()).toBe(0);
	});

	it("sweeps a note nobody played into a miss", () => {
		startPlaying();

		advance(1000);

		expect(game.score.counts().miss).toBe(1);
		expect(game.score.lastJudged()?.judgment).toBe("miss");
	});

	it("pauses without moving the stream, and resumes through a fresh count-in", () => {
		startPlaying();
		advance(2000);
		const beat = transport.currentBeat();

		game.pause();
		expect(game.phase()).toBe("paused");

		advance(5000);
		expect(transport.currentBeat()).toBeCloseTo(beat);
		expect(game.phase()).toBe("paused");

		game.resume();
		expect(game.phase()).toBe("countIn");

		advance(COUNT_IN_MS - 1);
		expect(game.phase()).toBe("countIn");

		advance(1);
		expect(game.phase()).toBe("playing");
	});

	it("keeps the seconds it had left across a pause", () => {
		startPlaying();
		advance(3000);
		const left = game.secondsRemaining();
		expect(left).toBeLessThan(game.settings().sessionSeconds);

		game.pause();
		advance(10_000);
		expect(game.secondsRemaining()).toBe(left);

		game.resume();
		advance(COUNT_IN_MS);
		expect(game.secondsRemaining()).toBe(left);
	});

	it("finishes when the countdown runs out", () => {
		game.updateSettings({ sessionSeconds: 2 });
		startPlaying();

		advance(2000);

		expect(game.phase()).toBe("finished");
		expect(transport.running()).toBe(false);
	});

	it("finishes on demand", () => {
		startPlaying();

		game.endGame();

		expect(game.phase()).toBe("finished");
		expect(transport.running()).toBe(false);
		// A finished game's loop is inert.
		expect(() => frame()).not.toThrow();
	});

	it("drops judged notes half a beat after their moment", () => {
		startPlaying();
		const first = game.notes()[0];

		// 0.3 beats: the note missed at +180ms and is still being drawn, part
		// way through the staff's fade.
		advance(300);
		expect(game.notes().some((note) => note.id === first?.id)).toBe(true);

		// Past PRUNE_AFTER_BEATS, which is set so the note leaves the list once
		// the fade has finished rather than while it crosses the clef.
		advance(1000);
		expect(game.notes().some((note) => note.id === first?.id)).toBe(false);
	});

	it("keeps the buffer full as the stream advances", () => {
		startPlaying();
		const spawned = game.spawner.notes().at(-1)?.beat ?? 0;

		advance(3000);

		expect(game.spawner.notes().at(-1)?.beat).toBeGreaterThan(spawned);
	});

	it("resets back to the settings screen", () => {
		startPlaying();
		advance(2000);

		game.reset();

		expect(game.phase()).toBe("ready");
		expect(game.score.score()).toBe(0);
		expect(game.notes()).toEqual([]);
		expect(game.secondsRemaining()).toBe(0);
	});

	it("merges settings patches", () => {
		game.updateSettings({ tempoBpm: 90 });
		game.updateSettings({ accidentals: true });

		expect(game.settings()).toMatchObject({
			tempoBpm: 90,
			accidentals: true,
			clef: "treble",
		});
	});

	it("falls back to the default key map until bindings arrive", () => {
		expect(game.keyToNoteMap()["a"]).toBe("C");

		game.keyBindings.set({ C: "1" });
		expect(game.keyToNoteMap()["1"]).toBe("C");
	});
});
