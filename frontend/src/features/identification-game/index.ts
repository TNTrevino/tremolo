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
export { useQuestionLoader } from "./hooks/useQuestionLoader";
export {
	QuestionDisplay,
	type QuestionDisplayProps,
} from "./components/QuestionBoard";
export { useIdentificationGame } from "./hooks/useIdentificationGame";
export { useGameTimer } from "./hooks/useGameTimer";
export { useGameLifecycle } from "./hooks/useGameLifecycle";
export { useSaveGameOnEnd } from "./hooks/useSaveGameOnEnd";
export { ScoreBar, type ScoreBarProps } from "./components/ScoreBar";
export {
	GameOverCard,
	type GameOverCardProps,
} from "./components/GameOverCard";

export { GameMode, GameState, TIME_LIMITS, NOTE_LIMITS } from "./types";
export type { BaseGameSettings, GeneratedQuestion } from "./types";

export { NATURAL_NOTES } from "./utils";
export { CLEF_UNICODE, CLEF_LABELS } from "./components/ClefGlyph";
export { clefsSetting } from "./settings/presets";

// Declarative settings UI — reused by the teacher's create-assignment flow
// to configure a game and snapshot the result as an assignment config.
export {
	SettingsControls,
	type SettingsControlsProps,
} from "./settings/SettingsControls";
export { GameModeLimitControls } from "./settings/GameModeLimitControls";
export type { SettingDescriptor } from "./settings/types";
