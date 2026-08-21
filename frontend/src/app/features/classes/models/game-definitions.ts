import type { GameType } from "../../../shared/models/game.types";

/**
 * Port of frontend-react/src/features/classes/gameDefinitions.ts.
 *
 * React's file re-exported the four `GameDefinition` objects themselves so
 * the assignment dialog could render each game's own settings UI and the
 * play page could hand the definition to the identification shell. Those
 * definitions are Phase 5 work (D9 rewrites them) and the note game is
 * Phase 6, so what this slice ports is the half that is pure data: which
 * game types exist, what to call them, and what config a brand-new
 * assignment freezes.
 *
 * **When Phase 5/6 land, `defaultAssignmentConfig()` must be replaced by a
 * read of each definition's own `defaults`** -- the values in `DEFAULTS`
 * below are copied from them, and a copy is exactly the thing that drifts.
 * The spec next to this file pins the copy so the drift is at least
 * visible.
 */

export const GAME_TYPE_LABELS: Record<GameType, string> = {
	note: "Note",
	key_signature: "Key Signature",
	scale: "Scale",
	chord: "Chord",
	interval: "Interval",
};

export const GAME_TYPE_OPTIONS: { value: GameType; label: string }[] =
	Object.entries(GAME_TYPE_LABELS).map(([value, label]) => ({
		value: value as GameType,
		label,
	}));

/**
 * Every game type except `note` -- the ones that ride the shared
 * identification shell. The note game is deliberately absent: it renders
 * through its own page, which is why React's `GENERIC_GAME_DEFINITIONS`
 * excluded it too.
 */
export type GenericGameType = Exclude<GameType, "note">;

export const GENERIC_GAME_TYPES: readonly GenericGameType[] = [
	"key_signature",
	"scale",
	"chord",
	"interval",
];

export function isGenericGameType(
	gameType: GameType,
): gameType is GenericGameType {
	return gameType !== "note";
}

/**
 * Whether a `game_type` off the wire is one this build can render.
 *
 * `GameType` is a compile-time claim about a runtime value: the Go service
 * fills `game_type`, so an assignment created against a newer backend can
 * carry a type this build has never heard of. React guarded that case --
 * `GENERIC_GAME_DEFINITIONS[gameType]` came back `undefined` and the play
 * page fell through to its not-found panel -- and this predicate is what
 * lets the port do the same without a definition registry to miss in.
 */
export function isKnownGameType(gameType: string): gameType is GameType {
	return Object.prototype.hasOwnProperty.call(GAME_TYPE_LABELS, gameType);
}

// The four identification games' `defaults`, and the note game's
// `NOTE_DEFAULTS` from CreateAssignmentDialog.tsx. Note that the note
// game's config is snake_case (it is posted straight to the music service)
// while the identification games' is camelCase -- that asymmetry is real
// and the assignment `config` blob is stored verbatim either way.
const ALL_KEY_SIGNATURES = Array.from({ length: 15 }, (_, i) => i - 7);

const ALL_SCALE_TYPES = [
	"major",
	"natural_minor",
	"harmonic_minor",
	"melodic_minor",
];

const ALL_QUALITIES = [
	"major",
	"minor",
	"augmented",
	"diminished",
	"dominant7",
	"major7",
	"minor7",
	"half_diminished7",
	"diminished7",
	"dominant9",
	"major9",
	"minor9",
];

const ALL_INTERVALS = [
	"m2",
	"M2",
	"m3",
	"M3",
	"P4",
	"A4",
	"d5",
	"P5",
	"m6",
	"M6",
	"m7",
	"M7",
	"P8",
];

const DEFAULTS: Record<GameType, Record<string, unknown>> = {
	note: {
		low_note: "C4",
		high_note: "C6",
		clef: "treble",
		game_mode: "time",
		time_limit: 30,
		note_limit: 25,
		scale: "C Major",
		octave: 4,
	},
	key_signature: {
		gameMode: "time",
		timeLimit: 30,
		noteLimit: 25,
		clefs: ["treble"],
		keySignatures: ALL_KEY_SIGNATURES,
		noteNames: "letters",
		answerMode: "major",
	},
	scale: {
		gameMode: "time",
		timeLimit: 60,
		noteLimit: 25,
		clefs: ["treble"],
		scaleTypes: ALL_SCALE_TYPES,
		questionMode: "accidentals",
	},
	chord: {
		gameMode: "time",
		timeLimit: 60,
		noteLimit: 25,
		clefs: ["treble"],
		qualities: ALL_QUALITIES,
		inversions: false,
	},
	interval: {
		gameMode: "time",
		timeLimit: 60,
		noteLimit: 25,
		clefs: ["treble"],
		displayMode: "harmonic",
		requireQuality: true,
		intervals: ALL_INTERVALS,
	},
};

/**
 * The config a new assignment freezes for a given game. A fresh object
 * every call, so the dialog can patch it without writing through to the
 * table (React got the same isolation from its `{ ...defaults }` spread).
 */
export function defaultAssignmentConfig(
	gameType: GameType,
): Record<string, unknown> {
	return structuredClone(DEFAULTS[gameType]);
}
