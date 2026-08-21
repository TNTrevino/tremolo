// Deep-imported rather than taken from the feature barrel: the barrel
// re-exports `GameStaffComponent`, which reaches `opensheetmusicdisplay`, and
// this module is read by four class specs that have no business loading a
// 1 MB engraver into jsdom. That is Phase 5's F1 addendum, §9 "not taken" --
// taken here. `games/index.ts` is definitions only.
import { GAME_DEFINITIONS } from "@features/identification-game/games";
import {
	NOTE_GAME_DEFAULTS,
	toNoteAssignmentConfig,
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
 * The config a new assignment freezes for a given game.
 *
 * **Nothing here is a copy any more.** The four identification games' defaults
 * are read off their own `GameDefinition` (Phase 5), and the note game's off
 * `NOTE_GAME_DEFAULTS`, the same constant its own page starts from (Phase 6) --
 * which is what the header above asked for. A duplicated table is exactly the
 * thing that drifts, and "settings live in the definition" is the feature's
 * whole premise.
 *
 * The note game's blob stays **snake_case** while the other four are
 * camelCase. That asymmetry is React's and is load-bearing: the note config is
 * shaped like the `note_game_settings` row and is posted straight at the music
 * service. `toNoteAssignmentConfig` is the one place the conversion happens,
 * and `mapNoteAssignmentConfig` reads it back when a student plays.
 *
 * A fresh object every call, so the dialog can patch it without writing
 * through to the definition (React got the same isolation from its
 * `{ ...defaults }` spread).
 */
export function defaultAssignmentConfig(
	gameType: GameType,
): Record<string, unknown> {
	if (gameType === "note") return toNoteAssignmentConfig(NOTE_GAME_DEFAULTS);
	// `defaults` is a game's settings *interface*, which has no index
	// signature; the assignment `config` blob is the same object seen as
	// opaque JSON, which is what the Go service stores and returns.
	return structuredClone({ ...GAME_DEFINITIONS[gameType].defaults });
}
