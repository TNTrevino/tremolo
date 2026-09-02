import { describe, expect, it } from "vitest";

import { defaultAssignmentConfig } from "../../classes/models/game-definitions";
import {
	extractTonic,
	mapNoteAssignmentConfig,
	NOTE_GAME_DEFAULTS,
	toNoteAssignmentConfig,
	type NoteAssignmentConfig,
} from "./note-game.models";

/**
 * The assignment `config` boundary.
 *
 * The note game is the one game whose frozen config is **snake_case**: it is
 * shaped like the `note_game_settings` row rather than like the game's own
 * settings object, and the Go service stores the blob verbatim. So a teacher
 * freezing an assignment and a student playing it cross a mapper in each
 * direction, and the two have to agree -- if they do not, assignment mode
 * silently falls back to the defaults instead of the assigned settings.
 */
describe("the note game's assignment config", () => {
	it("round-trips the defaults through both mappers", () => {
		const config = toNoteAssignmentConfig(NOTE_GAME_DEFAULTS);

		expect(mapNoteAssignmentConfig(config)).toEqual(NOTE_GAME_DEFAULTS);
	});

	it("is what a new note assignment freezes", () => {
		// The classes feature reads the note game's own defaults rather than
		// keeping a copy; this is the assertion that keeps the two in step.
		expect(defaultAssignmentConfig("note")).toEqual(
			toNoteAssignmentConfig(NOTE_GAME_DEFAULTS),
		);
	});

	it("writes snake_case, because the blob is stored verbatim", () => {
		expect(toNoteAssignmentConfig(NOTE_GAME_DEFAULTS)).toMatchObject({
			game_mode: "time",
			time_limit: 30,
			note_limit: 25,
			low_note: "C4",
			high_note: "C6",
			clef: "treble",
		});
	});

	it("leaves a field a stale blob is missing at its default", () => {
		// A hand-edited or older assignment must degrade, not clobber the
		// setting with `undefined`. React's per-field guards, kept.
		const patch = mapNoteAssignmentConfig({ scale: "F Major" });

		expect(patch).toEqual({ scale: "F Major" });
		expect("clef" in patch).toBe(false);
		expect("gameMode" in patch).toBe(false);
	});

	it("carries the legacy octave through untouched", () => {
		expect(mapNoteAssignmentConfig({ octave: 2 })).toEqual({ octave: 2 });
	});

	it("ignores keys it does not own", () => {
		const blob = {
			scale: "G Major",
			clefs: ["treble"],
		} as NoteAssignmentConfig;

		expect(mapNoteAssignmentConfig(blob)).toEqual({ scale: "G Major" });
	});
});

describe("extractTonic", () => {
	it("takes the tonic off a scale name, accidental included", () => {
		expect(extractTonic("Bb Major")).toBe("Bb");
		expect(extractTonic("C Major")).toBe("C");
	});
});
