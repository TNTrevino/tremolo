// From the data-only entry point, not the feature barrel: the barrel
// re-exports `GameStaffComponent`, which reaches `opensheetmusicdisplay`, and
// this module is read by four class specs that have no business loading a
// 1 MB engraver into jsdom. `frontend/CLAUDE.md`, "Barrel vs data entry
// point".
import {
	GAME_DEFINITIONS,
	type BaseGameSettings,
	type SettingDescriptor,
} from "@features/identification-game/data";
import {
	NOTE_GAME_DEFAULTS,
	toNoteAssignmentConfig,
	type GameSettings,
} from "@features/note-game/models/note-game.models";

import type { GameType } from "../../../shared/models/game.models";

/**
 * Port of frontend-react/src/features/classes/gameDefinitions.ts.
 *
 * React's file re-exported the four `GameDefinition` objects themselves so
 * the assignment dialog could render each game's own settings UI and the
 * play page could hand the definition to the identification shell. Phase 3
 * could only port the half that is pure data -- which game types exist and
 * what to call them -- because the definitions themselves were Phase 5's.
 *
 * **Phases 5 and 6 closed the gap it left:** `defaultAssignmentConfig()` now
 * reads each game's own `defaults` -- the identification games' off their
 * `GameDefinition`, the note game's off `NOTE_GAME_DEFAULTS` -- instead of
 * copied tables. No default is duplicated here any more.
 *
 * **Issue #261 split that single function into three.** The assignment
 * dialog needs to hold a game's settings *before* they are frozen -- so a
 * teacher can tune them -- which `defaultAssignmentConfig()` alone could not
 * express: it only ever produced the already-frozen config blob.
 * `defaultGameSettings()` is the editable starting point, `toAssignmentConfig()`
 * is the freeze step, and `defaultAssignmentConfig()` is now just the two of
 * them run back to back, kept for every caller that only ever wanted the
 * frozen result.
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
 *
 * `SettingsGameType` in `shared/models/game.models.ts` is the same
 * `Exclude<GameType, "note">` reached from the other direction -- every game
 * but the note game persists its settings as JSONB. The two aliases agree
 * today by coincidence of the note game being special twice over, not
 * because one is defined in terms of the other; they are deliberately not
 * unified, and a third alias should not be added.
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

/**
 * The settings a fresh assignment starts from, for a given game -- always
 * **camelCase**, unlike the config it eventually freezes into. This is what
 * the create-assignment dialog holds in its `gameSettings` signal and what
 * the embedded settings controls read and patch.
 *
 * The four identification games' defaults come straight off their own
 * `GameDefinition`; the note game's off `NOTE_GAME_DEFAULTS`, the same
 * constant its own page starts from. Neither table is duplicated here.
 *
 * A fresh object every call, so the dialog can patch it without writing
 * through to the definition (React got the same isolation from its
 * `{ ...defaults }` spread).
 */
export function defaultGameSettings(
	gameType: GameType,
): Record<string, unknown> {
	if (gameType === "note") return { ...NOTE_GAME_DEFAULTS };
	// `defaults` is a game's settings *interface*, which has no index
	// signature; the dialog's `gameSettings` signal holds the same object
	// seen as opaque data, which is what the settings controls patch.
	return structuredClone({ ...GAME_DEFINITIONS[gameType].defaults });
}

/**
 * Freezes a settings object -- shaped like `defaultGameSettings()` returns,
 * tuned or not -- into the blob an assignment's `config` stores.
 *
 * The note game's blob stays **snake_case** while the other four are
 * camelCase. That asymmetry is React's and is load-bearing: the note config
 * is shaped like the `note_game_settings` row and is posted straight at the
 * music service. `toNoteAssignmentConfig` is the one place the conversion
 * happens, and `mapNoteAssignmentConfig` reads it back when a student plays.
 * The other four games' settings *are* their own config, so freezing them is
 * just an isolating clone.
 */
export function toAssignmentConfig(
	gameType: GameType,
	settings: Record<string, unknown>,
): Record<string, unknown> {
	if (gameType === "note")
		return toNoteAssignmentConfig(settings as unknown as GameSettings);
	return structuredClone(settings);
}

/**
 * The config a new assignment freezes for a given game, before a teacher
 * tunes anything -- `defaultGameSettings()` run straight through
 * `toAssignmentConfig()`. Kept for callers (and the spec) that only ever
 * wanted the already-frozen result.
 */
export function defaultAssignmentConfig(
	gameType: GameType,
): Record<string, unknown> {
	return toAssignmentConfig(gameType, defaultGameSettings(gameType));
}

/**
 * The schema for a game's own tunable settings, or `null` for the note
 * game. The four identification games render theirs through
 * `<app-settings-controls>`, schema-driven like the play page's own settings
 * dialog; the note game has no schema because its settings render through
 * `<app-note-range-setting>` and a plain scale `<app-select>` instead.
 */
export function settingsSchemaFor(
	gameType: GameType,
): SettingDescriptor<BaseGameSettings>[] | null {
	if (gameType === "note") return null;
	return GAME_DEFINITIONS[gameType].settingsSchema;
}
