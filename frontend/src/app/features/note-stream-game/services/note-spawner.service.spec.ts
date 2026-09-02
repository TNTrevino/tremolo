import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it } from "vitest";

import {
	DEFAULT_RANGE,
	noteToIndex,
} from "@features/note-game/models/range.utils";

import {
	DEFAULT_NOTE_STREAM_SETTINGS,
	SPAWN_AHEAD_BEATS,
	type NoteStreamSettings,
} from "../models/note-stream.models";
import { NoteSpawnerService } from "./note-spawner.service";

/**
 * The note supply, with the RNG replaced.
 *
 * Every test that cares about a pitch scripts `random` and reads the notes
 * back; the ones that only care about the buffer let it run free. The
 * scripted sequences below are read in the order `spawn` consumes them:
 * one draw for the staff position, then -- only when accidentals are on --
 * one for whether there is an accidental at all and one for sharp vs flat.
 */

/** An RNG that walks a script and then repeats it. */
function sequence(values: number[]): () => number {
	let index = 0;
	return () => {
		const value = values[index % values.length] ?? 0;
		index += 1;
		return value;
	};
}

function settings(patch: Partial<NoteStreamSettings> = {}): NoteStreamSettings {
	return { ...DEFAULT_NOTE_STREAM_SETTINGS, ...patch };
}

describe("NoteSpawnerService", () => {
	let spawner: NoteSpawnerService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [NoteSpawnerService] });
		spawner = TestBed.inject(NoteSpawnerService);
		spawner.random = sequence([0.05, 0.42, 0.71, 0.19, 0.88, 0.33, 0.6]);
	});

	it("starts empty", () => {
		spawner.configure(settings());

		expect(spawner.notes()).toEqual([]);
	});

	it("puts one note on every integer beat, starting at zero", () => {
		spawner.configure(settings());
		spawner.ensureAhead(0);

		expect(spawner.notes().map((note) => note.beat)).toEqual([
			0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
		]);
	});

	it("fills the buffer to SPAWN_AHEAD_BEATS and no further", () => {
		spawner.configure(settings());
		spawner.ensureAhead(4);

		const beats = spawner.notes().map((note) => note.beat);
		expect(beats.at(-1)).toBe(4 + SPAWN_AHEAD_BEATS);
	});

	it("only tops the buffer up -- calling it every frame changes nothing", () => {
		spawner.configure(settings());
		spawner.ensureAhead(0);
		const first = spawner.notes();

		spawner.ensureAhead(0);
		expect(spawner.notes()).toBe(first);

		spawner.ensureAhead(3);
		expect(spawner.notes()).toHaveLength(first.length + 3);
	});

	it("spawns during the count-in, so the first note is already scrolling", () => {
		spawner.configure(settings());
		spawner.ensureAhead(-4);

		const beats = spawner.notes().map((note) => note.beat);
		expect(beats[0]).toBe(0);
		expect(beats.at(-1)).toBe(SPAWN_AHEAD_BEATS - 4);
	});

	it("gives every note a unique, ordered id", () => {
		spawner.configure(settings());
		spawner.ensureAhead(0);

		expect(spawner.notes().map((note) => note.id)).toEqual([
			0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
		]);
	});

	it("keeps every pitch inside the clef's default range", () => {
		for (const clef of ["treble", "bass"] as const) {
			spawner.random = sequence([0, 0.13, 0.27, 0.5, 0.74, 0.91, 0.999]);
			spawner.configure(settings({ clef }));
			spawner.ensureAhead(30);

			const low = noteToIndex(DEFAULT_RANGE[clef].low);
			const high = noteToIndex(DEFAULT_RANGE[clef].high);

			for (const note of spawner.notes()) {
				expect(note.diatonicIndex).toBeGreaterThanOrEqual(low);
				expect(note.diatonicIndex).toBeLessThanOrEqual(high);
			}
		}
	});

	it("reaches both ends of the range", () => {
		spawner.random = sequence([0, 0.999]);
		spawner.configure(settings({ clef: "treble" }));
		spawner.ensureAhead(20);

		const indices = spawner.notes().map((note) => note.diatonicIndex);
		expect(Math.min(...indices)).toBe(noteToIndex("C4"));
		expect(Math.max(...indices)).toBe(noteToIndex("C6"));
	});

	it("writes naturals only while accidentals are off", () => {
		spawner.configure(settings({ accidentals: false }));
		spawner.ensureAhead(30);

		for (const note of spawner.notes()) {
			expect(note.accidental).toBeNull();
			expect(note.name).toMatch(/^[A-G]$/);
		}
	});

	it("attaches sharps and flats once accidentals are on", () => {
		spawner.random = sequence([
			0, // lowest staff position ...
			0.1, // ... under the accidental chance ...
			0.2, // ... and on the sharp side of the coin
			0.5, // middle of the range ...
			0.1, // ... accidental again ...
			0.9, // ... flat this time
			0.999, // top of the range ...
			0.9, // ... and no accidental at all
		]);
		spawner.configure(settings({ clef: "treble", accidentals: true }));
		spawner.ensureAhead(-8);

		expect(spawner.notes().map((note) => [note.name, note.accidental])).toEqual(
			[
				["C#", "sharp"],
				["Cb", "flat"],
				["C", null],
			],
		);
	});

	it("never plays the same pitch twice in a row, even on a stuck RNG", () => {
		// A constant RNG draws the same note every time; the repeat guard is
		// what has to break the tie, and it has to terminate while doing it.
		spawner.random = () => 0;
		spawner.configure(settings());
		spawner.ensureAhead(30);

		const notes = spawner.notes();
		expect(notes.length).toBeGreaterThan(10);
		for (let i = 1; i < notes.length; i++) {
			const previous = notes[i - 1];
			const current = notes[i];
			expect([current?.name, current?.diatonicIndex]).not.toEqual([
				previous?.name,
				previous?.diatonicIndex,
			]);
		}
	});

	it("prunes by id, and leaves everything else alone", () => {
		spawner.configure(settings());
		spawner.ensureAhead(0);

		spawner.prune([0, 2, 4]);

		expect(spawner.notes().map((note) => note.id)).toEqual([
			1, 3, 5, 6, 7, 8, 9, 10,
		]);
	});

	it("ignores an empty prune", () => {
		spawner.configure(settings());
		spawner.ensureAhead(0);
		const before = spawner.notes();

		spawner.prune([]);

		expect(spawner.notes()).toBe(before);
	});

	it("drops the old stream on reconfigure", () => {
		spawner.configure(settings());
		spawner.ensureAhead(0);

		spawner.configure(settings({ clef: "bass" }));

		expect(spawner.notes()).toEqual([]);

		spawner.ensureAhead(0);
		expect(spawner.notes()[0]?.beat).toBe(0);
		expect(spawner.notes()[0]?.id).toBe(0);
	});
});
