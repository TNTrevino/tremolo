import { TestBed } from "@angular/core/testing";
import type { Mock } from "vitest";

import { GameTimerService } from "./game-timer.service";

/**
 * The countdown, and the property React's 65 lines of ref-mirroring were
 * protecting: **expiry fires exactly once**.
 */
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
		vi.useRealTimers();
	});

	/** Advances the clock and lets the `isRunning` signal reach the stream. */
	function advance(ms: number): void {
		TestBed.tick();
		vi.advanceTimersByTime(ms);
		TestBed.tick();
	}

	it("does not run until started", () => {
		advance(5000);

		expect(timer.isRunning()).toBe(false);
		expect(timer.remaining()).toBe(0);
		expect(expired).not.toHaveBeenCalled();
	});

	it("counts down one second at a time", () => {
		timer.start(3);
		expect(timer.remaining()).toBe(3);

		advance(1000);
		expect(timer.remaining()).toBe(2);

		advance(1000);
		expect(timer.remaining()).toBe(1);
	});

	it("fires expired exactly once at zero, and stops", () => {
		timer.start(2);
		advance(2000);

		expect(timer.remaining()).toBe(0);
		expect(timer.isRunning()).toBe(false);
		expect(expired).toHaveBeenCalledTimes(1);

		// Ten more seconds of wall clock must not produce a second game end.
		advance(10_000);
		expect(expired).toHaveBeenCalledTimes(1);
		expect(timer.remaining()).toBe(0);
	});

	it("stops without firing when stopped early", () => {
		timer.start(5);
		advance(1000);
		timer.stop();
		advance(10_000);

		expect(expired).not.toHaveBeenCalled();
		expect(timer.remaining()).toBe(4);
	});

	it("restarts cleanly, and the second countdown expires once too", () => {
		timer.start(1);
		advance(1000);
		expect(expired).toHaveBeenCalledTimes(1);

		timer.start(1);
		advance(1000);
		expect(expired).toHaveBeenCalledTimes(2);
	});

	it("formats as M:SS", () => {
		expect(timer.format(0)).toBe("0:00");
		expect(timer.format(9)).toBe("0:09");
		expect(timer.format(60)).toBe("1:00");
		expect(timer.format(125)).toBe("2:05");
	});

	it("clears both fields on reset", () => {
		timer.start(30);
		timer.reset();

		expect(timer.remaining()).toBe(0);
		expect(timer.isRunning()).toBe(false);
	});
});
