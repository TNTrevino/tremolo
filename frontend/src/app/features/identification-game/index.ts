/**
 * The identification-game feature's public surface.
 *
 * Port of frontend-react/src/features/identification-game/index.ts.
 * Everything else in the feature is reached by relative path from inside
 * it; export from here only what something outside actually needs.
 *
 * **Two entry points, and which one you use matters.** This barrel exports
 * components and services, and `QuestionBoardComponent` reaches
 * `opensheetmusicdisplay` through `GameStaffComponent`. `./data` exports the
 * same feature's constants, enums, model types and game definitions and
 * reaches no engraver at all.
 *
 * So: **components and services from here; data from `./data`.** Everything
 * `./data` exports is re-exported below too, so this barrel stays the single
 * public surface and no existing import breaks -- but a consumer that only
 * wants `TIME_LIMITS` should not pay for an engraver, and the rule is
 * written down in `frontend/CLAUDE.md`.
 *
 * `./data` is also where the "shared constants live once" invariant is
 * anchored: `TIME_LIMITS`, `NOTE_LIMITS`, `NATURAL_NOTES`, `CLEF_UNICODE`
 * and `CLEF_LABELS` are declared once, under this feature, and the note game
 * and the classes feature import rather than redeclare them.
 */

// --- Data, re-exported ---------------------------------------------------
//
// Constants, enums, model types, `defineGame`, the four game definitions,
// `GAME_DEFINITIONS` and `sanitizeConfig`. See `./data` for the list.

export * from "./data";

// --- The shell -----------------------------------------------------------

export { IdentificationGameComponent } from "./components/identification-game/identification-game.component";

// --- The engine, for the note game to compose ----------------------------

export { GameStateService } from "./services/game-state.service";
export type { GameStateConfig } from "./services/game-state.service";
export { GameTimerService } from "./services/game-timer.service";
export { GameScoreSaverService } from "./services/game-score-saver.service";
export { QuestionQueueService } from "./services/question-queue.service";
export type { QuestionQueueConfig } from "./services/question-queue.service";

// --- Reusable pieces of the board ----------------------------------------

export { GameStaffComponent } from "./components/game-staff/game-staff.component";
export { GameOverCardComponent } from "./components/game-over-card/game-over-card.component";
export { QuestionBoardComponent } from "./components/question-board/question-board.component";
export { ScoreBarComponent } from "./components/score-bar/score-bar.component";
export { AnswerPadComponent } from "./components/answer-pad/answer-pad.component";

export { ClefGlyphComponent } from "./components/clef-glyph/clef-glyph.component";
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
export { clefsSetting } from "./settings/presets";
