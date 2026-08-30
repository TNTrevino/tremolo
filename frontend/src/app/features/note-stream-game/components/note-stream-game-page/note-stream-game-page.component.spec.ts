import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COUNT_IN_BEATS } from "../../models/note-stream.models";
import { NoteStreamGameService } from "../../services/note-stream-game.service";
import { NoteStreamGamePageComponent } from "./note-stream-game-page.component";

/**
 * The page's phase-driven shell. Presses and scoring arithmetic are already
 * pinned by `note-stream-game.service.spec.ts`; this spec covers what only
 * the page adds -- the ready/playing/paused/finished screens, the start
 * gesture, and the Escape/visibility pause wiring.
 *
 * Frames are driven the same way the service spec drives them: fake timers
 * for the count-in and countdown, and a stubbed `transport.now` for the
 * beat. `<app-stream-staff>`'s own `requestAnimationFrame` loop is not
 * exercised here -- jsdom ships no rAF polyfill in this suite -- so `tick()`
 * is called directly, which is exactly what the staff's loop would have
 * called through `getCurrentBeat`.
 *
 * `game` comes off the fixture's own injector rather than the page's
 * `protected game` field, which TypeScript would otherwise refuse a spec
 * access to.
 */
describe("NoteStreamGamePageComponent", () => {
	let fixture: ComponentFixture<NoteStreamGamePageComponent>;
	let game: NoteStreamGameService;
	let clockMs: number;

	/** 60 BPM (the default), so a beat is a second and the count-in is four. */
	const COUNT_IN_MS = COUNT_IN_BEATS * 1000;

	beforeEach(() => {
		vi.useFakeTimers();
		clockMs = 0;

		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});

		fixture = TestBed.createComponent(NoteStreamGamePageComponent);
		game = fixture.debugElement.injector.get(NoteStreamGameService);
		game.transport.now = () => clockMs;
		game.spawner.random = () => 0;
		fixture.detectChanges();
	});

	afterEach(() => {
		game.endGame();
		vi.useRealTimers();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function button(label: string): HTMLButtonElement | undefined {
		return [...el().querySelectorAll("button")].find(
			(b) => b.textContent?.trim() === label,
		);
	}

	/** Moves both clocks, then runs a frame of the game loop -- see the file doc. */
	function advance(ms: number): void {
		TestBed.tick();
		clockMs += ms;
		vi.advanceTimersByTime(ms);
		game.tick(clockMs);
		TestBed.tick();
	}

	it("renders the ready phase with a start button", () => {
		expect(el().textContent).toContain("Note Stream");
		expect(button("Start")).toBeTruthy();
		expect(game.phase()).toBe("ready");
	});

	it("flips to countIn on start, then to playing once the count-in ends", () => {
		button("Start")?.click();
		fixture.detectChanges();

		expect(game.phase()).toBe("countIn");
		expect(el().textContent).toContain("Get ready");

		advance(COUNT_IN_MS);
		fixture.detectChanges();

		expect(game.phase()).toBe("playing");
		expect(el().textContent).not.toContain("Get ready");
	});

	it("pauses on Escape while playing, and shows the paused overlay", () => {
		button("Start")?.click();
		fixture.detectChanges();
		advance(COUNT_IN_MS);
		fixture.detectChanges();
		expect(game.phase()).toBe("playing");

		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		fixture.detectChanges();

		expect(game.phase()).toBe("paused");
		expect(el().textContent).toContain("Paused");
		expect(button("Resume")).toBeTruthy();
		expect(button("End run")).toBeTruthy();
	});

	it("does nothing on Escape before a game has started", () => {
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		fixture.detectChanges();

		expect(game.phase()).toBe("ready");
	});

	it("renders the results screen once the session finishes", () => {
		button("Start")?.click();
		fixture.detectChanges();
		advance(COUNT_IN_MS);
		fixture.detectChanges();

		game.endGame();
		fixture.detectChanges();

		expect(game.phase()).toBe("finished");
		expect(el().textContent).toContain("Stream complete");
		expect(button("Play again")).toBeTruthy();
		expect(button("Change settings")).toBeTruthy();
	});

	it("change settings on the results screen returns to the ready phase", () => {
		button("Start")?.click();
		fixture.detectChanges();
		game.endGame();
		fixture.detectChanges();

		button("Change settings")?.click();
		fixture.detectChanges();

		expect(game.phase()).toBe("ready");
		expect(button("Start")).toBeTruthy();
	});
});
