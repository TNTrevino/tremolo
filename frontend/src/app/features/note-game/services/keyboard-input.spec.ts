import {
	Injector,
	runInInjectionContext,
	signal,
	type WritableSignal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { DEFAULT_KEY_TO_NOTE_MAP } from "../models/keymap";
import { noteKeyboardInput } from "./keyboard-input";

/**
 * The keydown stream, driven through real `document` events.
 *
 * `enabled` reaches the stream through `toObservable`, which republishes on
 * a change-detection flush -- so every change to it is followed by
 * `TestBed.tick()` before a key is pressed.
 *
 * `onNote` takes a second argument, the event's `timeStamp`, which the note
 * stream game judges timing against. Every assertion on *which* notes fired
 * reads `notes()` so it stays about the translation; the timestamp gets its
 * own test.
 */

function press(key: string): KeyboardEvent {
	const event = new KeyboardEvent("keydown", { key, cancelable: true });
	document.dispatchEvent(event);
	return event;
}

describe("noteKeyboardInput", () => {
	let onNote: Mock<(note: string, timeStampMs: number) => void>;
	let enabled: WritableSignal<boolean>;
	let keyMap: WritableSignal<Record<string, string>>;

	/** The note names reported so far, dropping the timestamps. */
	const notes = (): string[] => onNote.mock.calls.map(([note]) => note);

	beforeEach(() => {
		onNote = vi.fn<(note: string, timeStampMs: number) => void>();
		enabled = signal(true);
		keyMap = signal<Record<string, string>>(DEFAULT_KEY_TO_NOTE_MAP);

		runInInjectionContext(TestBed.inject(Injector), () => {
			noteKeyboardInput({
				enabled,
				keyMap,
				onNote,
			});
		});
		TestBed.tick();
	});

	it("translates all three rows while the game is playing", () => {
		press("q");
		press("a");
		press("z");

		expect(notes()).toEqual(["C#", "C", "Cb"]);
	});

	it("is case-insensitive", () => {
		press("M");
		press("m");

		expect(notes()).toEqual(["Bb", "Bb"]);
	});

	it("reports the event's own timeStamp alongside the note", () => {
		const event = press("a");

		expect(onNote).toHaveBeenCalledWith("C", event.timeStamp);
	});

	it("ignores keys outside the map", () => {
		press("k");
		press("Enter");
		press("Escape");
		press("1");

		expect(onNote).not.toHaveBeenCalled();
	});

	it("prevents the browser's own handling of a bound key only", () => {
		expect(press("a").defaultPrevented).toBe(true);
		expect(press("k").defaultPrevented).toBe(false);
	});

	it("is inactive when not playing -- the listener is detached", () => {
		enabled.set(false);
		TestBed.tick();

		const event = press("a");

		expect(onNote).not.toHaveBeenCalled();
		// Not merely filtered: a disabled game must not swallow the key
		// either, or a dialog underneath it stops working.
		expect(event.defaultPrevented).toBe(false);
	});

	it("re-attaches when the game becomes playable again", () => {
		enabled.set(false);
		TestBed.tick();
		press("a");

		enabled.set(true);
		TestBed.tick();
		press("a");

		expect(notes()).toEqual(["C"]);
	});

	it("follows the current keymap when the player rebinds a key", () => {
		keyMap.set({ "1": "C", k: "Bb" });

		press("1");
		press("k");
		press("a");

		expect(notes()).toEqual(["C", "Bb"]);
	});

	it("stops listening when the injection context is destroyed", () => {
		TestBed.resetTestingModule();
		press("a");

		expect(onNote).not.toHaveBeenCalled();
	});
});
