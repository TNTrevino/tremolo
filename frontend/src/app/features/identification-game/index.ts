/**
 * The identification-game feature's public surface.
 *
 * Port of frontend-react/src/features/identification-game/index.ts.
 * Everything else in the feature is reached by relative path from inside
 * it; export from here only what something outside actually needs.
 *
 * **This is the one place the shared constants live** -- `TIME_LIMITS`,
 * `NOTE_LIMITS`, `NATURAL_NOTES`, `CLEF_UNICODE` and `CLEF_LABELS`. The
 * invariant in `frontend/CLAUDE.md` is that they are imported from here and
 * never redeclared; Phase 6's note game and the classes feature are the
 * consumers.
 */

// --- The shell and the games ---------------------------------------------

export { IdentificationGameComponent } from "./components/identification-game/identification-game.component";
export * from "./games";

// --- The engine, for the note game to compose ----------------------------

export { GameStateService } from "./services/game-state.service";
export type { GameStateConfig } from "./services/game-state.service";
export { GameTimerService } from "./services/game-timer.service";
export { GameScoreSaverService } from "./services/game-score-saver.service";
export {
	QuestionQueueService,
	HYDRATE_BATCH,
	QUEUE_LOW_WATER,
	RESET_DEBOUNCE_MS,
} from "./services/question-queue.service";
export type { QuestionQueueConfig } from "./services/question-queue.service";

// --- Reusable pieces of the board ----------------------------------------

export { GameStaffComponent } from "./components/game-staff/game-staff.component";
export { GameOverCardComponent } from "./components/game-over-card/game-over-card.component";
export { QuestionBoardComponent } from "./components/question-board/question-board.component";
export { ScoreBarComponent } from "./components/score-bar/score-bar.component";
export { AnswerPadComponent } from "./components/answer-pad/answer-pad.component";

// --- Models and shared constants -----------------------------------------

export {
	GameMode,
	GameState,
	NOTE_LIMITS,
	TIME_LIMITS,
} from "./models/game-state.models";
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

export { formatTimeLength, NATURAL_NOTES } from "./game.utils";

export {
	ClefGlyphComponent,
	CLEF_LABELS,
	CLEF_UNICODE,
} from "./components/clef-glyph/clef-glyph.component";
export {
	KeySignatureGlyphComponent,
	keySignatureName,
} from "./components/key-signature-glyph/key-signature-glyph.component";

// --- The declarative settings UI -----------------------------------------
//
// Reused by the teacher's create-assignment flow, which configures a game
// and snapshots the result as an assignment config.

export { SettingsControlsComponent } from "./settings/settings-controls.component";
export { GameModeLimitControlsComponent } from "./settings/game-mode-limit-controls.component";
export { SettingChipComponent } from "./settings/setting-chip.component";
export { sanitizeConfig } from "./settings/sanitize-config";
export { clefsSetting } from "./settings/presets";
