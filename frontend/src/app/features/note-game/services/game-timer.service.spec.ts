import { TestBed } from "@angular/core/testing";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";

import { GameTimerService } from "./game-timer.service";

describe("GameTimerService", () => {
	let timer: GameTimerService;
	let expired: Mock<() => void>;

	beforeEach(() => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({ providers: [GameTimerService] });
		timer = TestBed.inject(GameTimerService);
		expired = vi.fn<() => void>();
		timer.expired.subscribe(expired);
	});

	afterEach(() => {
		TestBed.resetTestingModule();
		vi.useRealTimers();
	});

	/** Lets the `isRunning` signal reach the stream, then runs the clock. */
	function advance(ms: number): void {
		TestBed.tick();
		vi.advanceTimersByTime(ms);
	}

	it("does not tick until it is started", () => {
		advance(5000);
		expect(timer.timeRemaining()).toBe(0);
		expect(timer.isRunning()).toBe(false);
	});

	it("counts down one second at a time", () => {
		timer.startTimer(3);
		expect(timer.timeRemaining()).toBe(3);

		advance(1000);
		expect(timer.timeRemaining()).toBe(2);

		vi.advanceTimersByTime(1000);
		expect(timer.timeRemaining()).toBe(1);
	});

	it("holds the full limit for a whole second after starting", () => {
		timer.startTimer(30);
		TestBed.tick();
		vi.advanceTimersByTime(999);
		expect(timer.timeRemaining()).toBe(30);
	});

	it("fires expired exactly once at zero and stops", () => {
		timer.startTimer(2);
		advance(2000);

		expect(timer.timeRemaining()).toBe(0);
		expect(timer.isRunning()).toBe(false);
		expect(expired).toHaveBeenCalledTimes(1);

		// The stream must be off: a stopped timer that keeps firing would
		// save a second score entry.
		vi.advanceTimersByTime(10_000);
		expect(expired).toHaveBeenCalledTimes(1);
	});

	it("stops without firing when the game ends early", () => {
		timer.startTimer(30);
		advance(2000);
		timer.stopTimer();
		advance(60_000);

		expect(expired).not.toHaveBeenCalled();
		expect(timer.timeRemaining()).toBe(28);
	});

	it("resetTimer clears the clock", () => {
		timer.startTimer(30);
		advance(2000);
		timer.resetTimer();

		expect(timer.timeRemaining()).toBe(0);
		expect(timer.isRunning()).toBe(false);
	});

	it("restarts cleanly for the next game", () => {
		timer.startTimer(2);
		advance(2000);
		expect(expired).toHaveBeenCalledTimes(1);

		timer.startTimer(2);
		advance(2000);
		expect(expired).toHaveBeenCalledTimes(2);
	});

	it("formats as m:ss", () => {
		expect(timer.formatTime(0)).toBe("0:00");
		expect(timer.formatTime(9)).toBe("0:09");
		expect(timer.formatTime(30)).toBe("0:30");
		expect(timer.formatTime(60)).toBe("1:00");
		expect(timer.formatTime(125)).toBe("2:05");
	});
});
