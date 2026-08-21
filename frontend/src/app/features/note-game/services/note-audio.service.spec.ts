import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getNoteFileName, NoteAudioService } from "./note-audio.service";

/**
 * jsdom has no `AudioContext`, so playback itself is a no-op here -- which is
 * the behaviour being pinned: an environment without Web Audio must not throw
 * and must not stop the game loop. What is asserted for real is the note ->
 * sample mapping (verbatim from React, enharmonics and all) and the eager
 * fetch that replaces howler's preload.
 */

describe("getNoteFileName", () => {
	it("maps the twelve samples", () => {
		expect(getNoteFileName("C")).toBe("c4");
		expect(getNoteFileName("C#")).toBe("csharp4");
		expect(getNoteFileName("D")).toBe("d4");
		expect(getNoteFileName("D#")).toBe("dsharp4");
		expect(getNoteFileName("E")).toBe("e4");
		expect(getNoteFileName("F")).toBe("f4");
		expect(getNoteFileName("F#")).toBe("fsharp4");
		expect(getNoteFileName("G")).toBe("g4");
		expect(getNoteFileName("G#")).toBe("gsharp4");
		expect(getNoteFileName("A")).toBe("a4");
		expect(getNoteFileName("A#")).toBe("asharp4");
		expect(getNoteFileName("B")).toBe("b4");
	});

	it("plays the enharmonic sample for a flat", () => {
		expect(getNoteFileName("Db")).toBe(getNoteFileName("C#"));
		expect(getNoteFileName("Eb")).toBe(getNoteFileName("D#"));
		expect(getNoteFileName("Gb")).toBe(getNoteFileName("F#"));
		expect(getNoteFileName("Ab")).toBe(getNoteFileName("G#"));
		expect(getNoteFileName("Bb")).toBe(getNoteFileName("A#"));
	});

	it("accepts the unicode sharp and stray whitespace", () => {
		expect(getNoteFileName("C♯")).toBe("csharp4");
		expect(getNoteFileName("  d  ")).toBe("d4");
	});

	it("has no sample for the notes the game can still show", () => {
		// Cb, Fb, E# and B# are answerable but have no marimba file --
		// React logged and moved on, and so does the service.
		for (const note of ["Cb", "Fb", "E#", "B#"]) {
			expect(getNoteFileName(note)).toBe("");
		}
	});
});

describe("NoteAudioService", () => {
	let audio: NoteAudioService;
	let backend: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});
		audio = TestBed.inject(NoteAudioService);
		backend = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		backend.verify();
		TestBed.resetTestingModule();
	});

	it("preloads all twelve samples as raw bytes", () => {
		audio.preload();

		const requests = backend.match(() => true);
		expect(requests).toHaveLength(12);
		expect(requests[0]?.request.responseType).toBe("arraybuffer");
		expect(requests.map((r) => r.request.url)).toContain(
			"/audio/marimba-c4.mp3",
		);
		expect(requests.map((r) => r.request.url)).toContain(
			"/audio/marimba-asharp4.mp3",
		);
		requests.forEach((r) => r.flush(new ArrayBuffer(8)));
	});

	it("fetches each sample once", () => {
		audio.preload();
		backend.match(() => true).forEach((r) => r.flush(new ArrayBuffer(8)));

		audio.preload();
		backend.expectNone(() => true);
	});

	it("fetches nothing for an unknown note", () => {
		audio.playNoteSound("Cb");
		backend.expectNone(() => true);
	});

	it("does not throw where the platform has no Web Audio", () => {
		expect(() => audio.playNoteSound("C")).not.toThrow();
		backend.match(() => true).forEach((r) => r.flush(new ArrayBuffer(8)));
	});
});
