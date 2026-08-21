/**
 * Port of frontend-react/src/features/note-game/types/index.ts.
 *
 * The note game's own settings shape and its option lists. Everything the
 * engine owns comes through `engine.models.ts` (the Phase-5 seam) -- nothing
 * here redeclares `NATURAL_NOTES`, `TIME_LIMITS` or `NOTE_LIMITS`.
 */

import type { RangeClef } from "../../../shared/models/music.models";
import type { BaseGameSettings, GameStats } from "./engine.models";
import { NATURAL_NOTES } from "./engine.models";

/** `GameStats` plus the note game's extra summary fields (`statsExtras`). */
export interface NoteGameStats extends GameStats {
	scale?: string;
}

/** Game settings configuration. */
export interface GameSettings extends BaseGameSettings {
	scale: string;
	/**
	 * **Legacy persistence only.** The note range is what actually plays --
	 * the music service picks a pitch inside `[lowNote, highNote]` and
	 * ignores this. It is still read from and written back to
	 * `note_game_settings` so settings saved before the range picker existed
	 * keep loading. Do not "fix" it into meaningful behaviour
	 * (`frontend/CLAUDE.md`, note-game invariants).
	 */
	octave: number;
	/** Lowest note in the practice range (natural note, e.g. "C4"). */
	lowNote: string;
	/** Highest note in the practice range (natural note, e.g. "C6"). */
	highNote: string;
	clef: RangeClef;
}

/** The pitch range + clef generated notes must fit. */
export interface NoteRange {
	/** Lowest allowed note, natural (e.g. "F3"). */
	lowNote: string;
	/** Highest allowed note, natural (e.g. "C6"). */
	highNote: string;
	clef: RangeClef;
}

/** Available musical scales. */
export const SCALES = [
	"C Major",
	"F Major",
	"Bb Major",
	"Eb Major",
	"Ab Major",
	"Db Major",
	"Gb Major",
	"G Major",
	"D Major",
	"A Major",
	"E Major",
	"B Major",
] as const;

/** Musical notes -- the answer pad's seven columns. */
export const NOTES = NATURAL_NOTES;
