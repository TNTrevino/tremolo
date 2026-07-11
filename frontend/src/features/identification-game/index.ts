/**
 * Identification Game Feature (shared engine)
 *
 * Public surface: the page shell + game definitions (consumed by
 * pages/), the generic hooks and constants the note game composes, and
 * the shared music helpers. Internal pieces (QuestionBoard, AnswerPad,
 * SettingsControls, sanitizeConfig, ...) are imported via relative
 * paths inside the feature — export them here only when something
 * outside actually needs them.
 */

export { IdentificationGamePage } from "./components/IdentificationGamePage";
export * from "./games";

export { useQuestionQueue } from "./hooks/useQuestionQueue";
export { useIdentificationGame } from "./hooks/useIdentificationGame";
export { useGameTimer } from "./hooks/useGameTimer";
export { useSaveGameOnEnd } from "./hooks/useSaveGameOnEnd";
export { ScoreBar, type ScoreBarProps } from "./components/ScoreBar";

export { GameMode, GameState, TIME_LIMITS, NOTE_LIMITS } from "./types";
export type { BaseGameSettings, GeneratedQuestion } from "./types";

export {
	NATURAL_NOTES,
	fromMusic21NoteName,
	toMusic21NoteName,
	formatTimeLength,
} from "./utils";
export { CLEF_UNICODE } from "./components/ClefGlyph";
export { clefsSetting } from "./settings/presets";
