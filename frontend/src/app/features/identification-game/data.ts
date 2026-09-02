/**
 * The identification-game feature's **data-only** entry point.
 *
 * `@features/identification-game` (the barrel, `index.ts`) exports the
 * feature's components and services, and one of them --
 * `QuestionBoardComponent` -> `GameStaffComponent` -> `SheetMusicComponent`
 * -- imports `opensheetmusicdisplay`, a ~1 MB music engraver. Anything that
 * touches the barrel therefore loads it, however little of the barrel it
 * actually wants.
 *
 * That is why this file exists. **Import shared constants, enums, model
 * types and game definitions from here; import components and services from
 * the barrel.** Nothing reachable from this module imports
 * `opensheetmusicdisplay`, or any Angular component, so a settings control
 * that only wants `TIME_LIMITS` does not drag an engraver into the bundle
 * chunk -- or, when it is a spec, into jsdom.
 *
 * The rule is the one in `frontend/CLAUDE.md` under "Barrel vs data entry
 * point". It is enforced by reading, not by a lint rule; the standing check
 * is that no `*.ts` under `features/note-game/` or `features/classes/`
 * imports a *value* from the barrel that is listed below.
 *
 * History: Phase 5's verifier traced a test flake (F1) to a spec pulling
 * OSMD in through this barrel, and left the split as a recorded carry-over.
 * Phase 7 took it. The flake itself was fixed separately, by `isolate: true`
 * in `angular.json`; this is the hygiene half.
 */

// --- Shared constants ----------------------------------------------------
//
// The one place these live. Nothing redeclares them.

export {
	CLEF_LABELS,
	CLEF_UNICODE,
	formatTimeLength,
	NATURAL_NOTES,
} from "./game.utils";

export {
	GameMode,
	GameState,
	NOTE_LIMITS,
	TIME_LIMITS,
} from "./models/game-state.models";

export {
	HYDRATE_BATCH,
	QUEUE_LOW_WATER,
	RESET_DEBOUNCE_MS,
} from "./services/question-queue.service";

// --- Model types ---------------------------------------------------------

export type {
	BaseGameSettings,
	GameStats,
	GeneratedQuestion,
	NoteAnswer,
} from "./models/game-state.models";

export { defineGame } from "./models/game-definition.models";
export type {
	AnswerOption,
	GameDefinition,
} from "./models/game-definition.models";

export type {
	ChoiceOption,
	OptionGlyph,
	SettingDescriptor,
} from "./models/setting-descriptor.models";

// --- The game definitions ------------------------------------------------
//
// `GAME_DEFINITIONS` and the four definitions are plain data: settings
// schemas, request mappers and `Observable` fetchers. They take the music
// service as an argument rather than injecting it (see `GameDefinition`),
// so none of them reaches a component.

export * from "./games";

// --- Pure functions over the above ---------------------------------------

export { sanitizeConfig } from "./settings/sanitize-config";
