/**
 * Port of frontend-react/src/features/note-game/types/index.ts.
 *
 * The note game's own settings shape, its option lists, its defaults and the
 * two mappers that cross the assignment `config` boundary. Everything the
 * engine owns comes from the identification-game feature -- nothing here
 * redeclares `NATURAL_NOTES`, `TIME_LIMITS` or `NOTE_LIMITS`.
 *
 * The engine import below goes to `@features/identification-game/data`, the
 * feature's **data-only** entry point, not to its barrel: the barrel
 * re-exports `GameStaffComponent`, which reaches `opensheetmusicdisplay`, and
 * this module is pure data read by `classes/models/game-definitions.ts`, so
 * the barrel would drag a 1 MB engraver into four class specs' jsdom for a
 * string table. `frontend/CLAUDE.md`, "Barrel vs data entry point".
 */

import type { RangeClef } from "../../../shared/models/music.models";
import type { NoteGameSettingsDto } from "../../../shared/models/game.models";
import {
	GameMode,
	NATURAL_NOTES,
	type BaseGameSettings,
	type GameStats,
} from "@features/identification-game/data";
import { DEFAULT_RANGE } from "./range.utils";

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

/**
 * `"C Major"` -> `"C"`. The music service takes a tonic, not a scale name;
 * the notation conversion that follows it happens in `MusicService` and
 * nowhere else.
 */
export function extractTonic(scale: string): string {
	return scale.split(" ")[0] ?? "C";
}

/**
 * The settings a fresh note game starts on. React's `DEFAULT_SETTINGS` from
 * `useNoteGame.ts`, and also what a new assignment freezes -- the note game's
 * half of "settings live in the definition", which is why
 * `classes/models/game-definitions.ts` reads this rather than keeping the
 * copy it used to.
 */
export const NOTE_GAME_DEFAULTS: GameSettings = {
	gameMode: GameMode.Time,
	timeLimit: 30,
	noteLimit: 25,
	scale: "C Major",
	// Legacy persistence; the range is what plays. See GameSettings.
	octave: 4,
	clef: "treble",
	lowNote: DEFAULT_RANGE.treble.low,
	highNote: DEFAULT_RANGE.treble.high,
};

/**
 * The **snake_case** blob an assignment freezes for the note game.
 *
 * The asymmetry with the four identification games -- whose configs are
 * camelCase -- is React's and is load-bearing: this one is shaped like the
 * `note_game_settings` row and is posted straight at the music service, and
 * the blob is stored verbatim either way. `game-definitions.spec.ts` pins it.
 */
export type NoteAssignmentConfig = Partial<
	Omit<NoteGameSettingsDto, "id" | "user_id">
>;

/** The settings a teacher freezes, as the blob the assignment stores. */
export function toNoteAssignmentConfig(
	settings: GameSettings,
): NoteAssignmentConfig {
	return {
		game_mode: settings.gameMode,
		time_limit: settings.timeLimit,
		note_limit: settings.noteLimit,
		scale: settings.scale,
		octave: settings.octave,
		low_note: settings.lowNote,
		high_note: settings.highNote,
		clef: settings.clef,
	};
}

/**
 * A frozen assignment config as a settings patch. React's
 * `mapNoteConfigToSettings`, and the reason the page needs two mappers where
 * React needed one: React read its *saved settings* straight off the wire in
 * snake_case too, while Phase 3's `UserService` maps that row to camelCase at
 * the API boundary. The assignment blob has no such mapper -- it is opaque
 * JSONB the Go service never looks inside -- so it arrives snake_case.
 *
 * Per-field guards, as in React: a stale or hand-edited blob leaves a setting
 * at its default rather than clobbering it with `undefined`.
 */
export function mapNoteAssignmentConfig(
	config: NoteAssignmentConfig,
): Partial<GameSettings> {
	const patch: Partial<GameSettings> = {};
	if (config.game_mode !== undefined)
		patch.gameMode = config.game_mode as GameMode;
	if (config.time_limit !== undefined) patch.timeLimit = config.time_limit;
	if (config.note_limit !== undefined) patch.noteLimit = config.note_limit;
	if (config.scale !== undefined) patch.scale = config.scale;
	if (config.octave !== undefined) patch.octave = config.octave;
	if (config.low_note !== undefined) patch.lowNote = config.low_note;
	if (config.high_note !== undefined) patch.highNote = config.high_note;
	if (config.clef !== undefined) patch.clef = config.clef as RangeClef;
	return patch;
}
