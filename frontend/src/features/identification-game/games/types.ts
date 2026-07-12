import type { GameSettingsRequest } from "@/services/api/types";
import type { AnswerOption } from "../components/AnswerPad";
import type { BaseGameSettings, GeneratedQuestion } from "../types";
import type { SettingDescriptor } from "../settings/types";

/**
 * A complete, declarative description of one identification game.
 *
 * Adding a game to the app = write one of these (plus its Python
 * endpoint), render it with <IdentificationGamePage definition={...}>,
 * and add a route. The settings UI, persistence, sanitization of saved
 * configs, score saving, and game flow all come from the definition.
 */
export interface GameDefinition<
	T extends GeneratedQuestion,
	S extends BaseGameSettings,
	Req = unknown,
> {
	/** Persistence key (entries + saved settings) */
	gameType: GameSettingsRequest["game_type"];
	title: string;
	description: string;
	defaults: S;
	/** Game-specific settings, rendered by SettingsControls */
	settingsSchema: SettingDescriptor<S>[];
	/**
	 * Maps settings to the request payload. The question queue keys on
	 * the serialized request, so by construction it only resets when a
	 * setting that actually changes the payload changes — mode/limit
	 * (and other non-request) tweaks keep the prefetched questions.
	 */
	toRequest: (settings: S) => Req;
	fetchQuestion: (request: Req) => Promise<T>;
	/** The correct answer value for a fetched question */
	getAnswer: (question: T, settings: S) => string;
	/** Answer buttons (values must match getAnswer output) */
	answerOptions: (settings: S) => AnswerOption[];
	/** Tailwind grid-cols-* class for the answer pad */
	columnsClassName?: string;
	/** OSMD zoom for the question display */
	zoom?: number;
	/** Optional prompt between staff and answers (e.g. "__ Major") */
	prompt?: (settings: S) => React.ReactNode;
}

/** Identity helper so game modules get full inference + checking. */
export function defineGame<
	T extends GeneratedQuestion,
	S extends BaseGameSettings,
	Req,
>(definition: GameDefinition<T, S, Req>): GameDefinition<T, S, Req> {
	return definition;
}
