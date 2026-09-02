import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COUNT_IN_BEATS } from "../models/note-stream.models";
import { StreamTransportService } from "./stream-transport.service";

/**
 * The clock, driven by a fake `now`.
 *
 * Two fake clocks run in step here and both are needed: `transport.now` is
 * what the beat is computed from, and vitest's fake timers are what the
 * lookahead scheduler and the count-in `setTimeout` run on. `advance()`
 * moves them together, because a spec that moved only one would be testing
 * a transport that cannot exist.
 *
 * jsdom has no `AudioContext`, so there is no metronome in any of this --
 * which is the point of the last test: the whole clock has to keep working
 * in an environment with no Web Audio, because a browser that blocks audio
 * still has to be playable.
 */
describe("StreamTransportService", () => {
	let transport: StreamTransportService;
	let clockMs: number;

	/** `performance.now()` at the moment `start()` is called in each test. */
	const STARTED_AT = 10_000;

	beforeEach(() => {
		vi.useFakeTimers();
		clockMs = STARTED_AT;

		TestBed.configureTestingModule({ providers: [StreamTransportService] });
		transport = TestBed.inject(StreamTransportService);
		transport.now = () => clockMs;
	});

	afterEach(() => {
		transport.stop();
		vi.useRealTimers();
	});

	/** Moves the wall clock and the timer queue forward together. */
	function advance(ms: number): void {
		clockMs += ms;
		vi.advanceTimersByTime(ms);
	}

	it("is parked at beat 0 before anything starts", () => {
		expect(transport.currentBeat()).toBe(0);
		expect(transport.running()).toBe(false);
		expect(transport.countingIn()).toBe(false);
	});

	it("opens the clock a count-in before the first note", () => {
		transport.start(60);

		expect(transport.currentBeat()).toBe(-COUNT_IN_BEATS);
		expect(transport.running()).toBe(true);
		expect(transport.countingIn()).toBe(true);
		expect(transport.bpm).toBe(60);
	});

	it("runs one beat per second at 60 bpm", () => {
		transport.start(60);

		advance(1000);
		expect(transport.currentBeat()).toBeCloseTo(-3);

		advance(4000);
		expect(transport.currentBeat()).toBeCloseTo(1);
	});

	it("runs two beats per second at 120 bpm", () => {
		transport.start(120);

		advance(1000);
		expect(transport.currentBeat()).toBeCloseTo(-2);

		advance(1500);
		expect(transport.currentBeat()).toBeCloseTo(1);
	});

	it("drops the count-in flag when the count-in is over", () => {
		transport.start(60);

		advance(3999);
		expect(transport.countingIn()).toBe(true);

		advance(1);
		expect(transport.countingIn()).toBe(false);
		expect(transport.currentBeat()).toBeCloseTo(0);
	});

	it("puts beat 0 a count-in after the start, in ms", () => {
		transport.start(60);

		expect(transport.beatToTimeMs(0)).toBe(STARTED_AT + 4000);
		expect(transport.beatToTimeMs(3)).toBe(STARTED_AT + 7000);
		expect(transport.beatToTimeMs(-COUNT_IN_BEATS)).toBe(STARTED_AT);
	});

	it("round-trips beats through milliseconds and back", () => {
		transport.start(96);

		for (const beat of [-4, -0.5, 0, 1, 7.25, 120]) {
			expect(transport.timeMsToBeat(transport.beatToTimeMs(beat))).toBeCloseTo(
				beat,
			);
		}
	});

	it("freezes the beat on pause, however long the pause lasts", () => {
		transport.start(60);
		advance(6000);
		expect(transport.currentBeat()).toBeCloseTo(2);

		transport.pause();
		expect(transport.running()).toBe(false);

		advance(30_000);
		expect(transport.currentBeat()).toBeCloseTo(2);
	});

	it("holds the scroll still through the resume count-in, then carries on", () => {
		transport.start(60);
		advance(6000);
		transport.pause();
		advance(5000);

		transport.resume();
		expect(transport.running()).toBe(true);
		expect(transport.countingIn()).toBe(true);

		// Four clicks with the stream standing exactly where it stopped.
		advance(2000);
		expect(transport.currentBeat()).toBeCloseTo(2);
		expect(transport.countingIn()).toBe(true);

		advance(2000);
		expect(transport.countingIn()).toBe(false);
		expect(transport.currentBeat()).toBeCloseTo(2);

		// And only then does it move again.
		advance(1000);
		expect(transport.currentBeat()).toBeCloseTo(3);
	});

	it("slides the beat grid so a paused note keeps its own timing", () => {
		transport.start(60);
		advance(6000);
		transport.pause();
		advance(5000);

		const resumedAt = clockMs;
		transport.resume();

		// Beat 2 is where the scroll is frozen, so it must fall exactly at
		// the end of the resume count-in -- not at its old wall time.
		expect(transport.beatToTimeMs(2)).toBe(resumedAt + 4000);
		expect(transport.beatToTimeMs(3)).toBe(resumedAt + 5000);
	});

	it("ignores a resume that was never paused, and a pause that never ran", () => {
		transport.resume();
		expect(transport.running()).toBe(false);

		transport.start(60);
		advance(2000);
		transport.resume();
		expect(transport.currentBeat()).toBeCloseTo(-2);

		transport.stop();
		transport.pause();
		expect(transport.running()).toBe(false);
	});

	it("leaves the beat where it died on stop", () => {
		transport.start(60);
		advance(9000);

		transport.stop();
		expect(transport.running()).toBe(false);
		expect(transport.countingIn()).toBe(false);
		expect(transport.currentBeat()).toBeCloseTo(5);

		advance(10_000);
		expect(transport.currentBeat()).toBeCloseTo(5);
	});

	it("runs silently, and correctly, with no Web Audio at all", () => {
		expect(typeof AudioContext).toBe("undefined");

		expect(() => {
			transport.start(60);
			advance(5000);
			transport.pause();
			transport.resume();
			advance(5000);
			transport.stop();
		}).not.toThrow();
	});

	it("stops its timers when the injector goes down", () => {
		transport.start(60);
		TestBed.resetTestingModule();

		expect(vi.getTimerCount()).toBe(0);
	});
});
