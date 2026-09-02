import type { Observable } from "rxjs";

import type { SettingsGameType } from "@shared/models/game.models";
import type { MusicService } from "@shared/services/music.service";

import type { BaseGameSettings, GeneratedQuestion } from "./game-state.models";
import type { SettingDescriptor } from "./setting-descriptor.models";

/** One button on the answer pad. */
export interface AnswerOption {
	/** Passed to the answer handler; must match `getAnswer`'s output. */
	value: string;
	/** Text on the button. Defaults to `value`. */
	label?: string;
	/** Button style. Defaults to `"outline"`; `"secondary"` marks naturals. */
	variant?: "default" | "outline" | "secondary";
}

/**
 * A complete, declarative description of one identification game.
 *
 * Adding a game to the app = write one of these (plus its Python endpoint),
 * point a page at it with `<app-identification-game [definition]="...">`,
 * and add a route. The settings UI, persistence, sanitization of saved
 * configs, score saving, and game flow all come from the definition.
 *
 * Two fields changed from React (D9 / PLAN.md §5.7): `prompt` returns a
 * plain string instead of a `React.ReactNode`, and `ChoiceOption.render`
 * became `ChoiceOption.glyph`. That is what lets all four definitions be
 * `.ts` -- `keySignature` was a `.tsx` purely to build `<KeySignatureGlyph>`
 * into its 15 options. `fetchQuestion` returns `Observable<T>` rather than
 * `Promise<T>` (D5), which is also what makes the prefetch queue's
 * `switchMap` stale-response guard possible (PLAN.md §5.5).
 */
export interface GameDefinition<
	T extends GeneratedQuestion,
	S extends BaseGameSettings,
	Req = unknown,
> {
	/** Persistence key: score entries and saved settings both use it. */
	gameType: SettingsGameType;
	title: string;
	description: string;
	defaults: S;
	/** Game-specific settings, rendered by `<app-settings-controls>`. */
	settingsSchema: SettingDescriptor<S>[];
	/**
	 * Maps settings to the request payload.
	 *
	 * **The question queue keys on `JSON.stringify(toRequest(settings))`**,
	 * so by construction it only resets when a setting that actually changes
	 * the payload changes -- mode and limit tweaks keep the prefetched
	 * questions. Any setting that affects the request MUST flow through
	 * here, or prefetched questions go stale.
	 */
	toRequest: (settings: S) => Req;
	/**
	 * Fetches one question.
	 *
	 * The music service arrives as an argument rather than through
	 * `inject()`, because the prefetch queue calls this from inside a
	 * `switchMap` -- not an injection context, where `inject()` throws
	 * NG0203 (the same trap Phase 1 hit in `catchError`, STATE.md 1/1).
	 * Passing it also means a game definition can be exercised in a test
	 * with a stub and no TestBed at all.
	 */
	fetchQuestion: (request: Req, music: MusicService) => Observable<T>;
	/** The correct answer for a fetched question. */
	getAnswer: (question: T, settings: S) => string;
	/** Answer buttons; their values must match `getAnswer`'s output. */
	answerOptions: (settings: S) => AnswerOption[];
	/** Tailwind `grid-cols-*` class for the answer pad. */
	columnsClassName?: string;
	/** OSMD zoom for the question display. */
	zoom?: number;
	/** Line between staff and answers, e.g. `"__ Major"`. */
	prompt?: (settings: S) => string;
}

/**
 * Identity helper so a game module gets full inference and checking on its
 * object literal. React's `defineGame`, unchanged.
 */
export function defineGame<
	T extends GeneratedQuestion,
	S extends BaseGameSettings,
	Req,
>(definition: GameDefinition<T, S, Req>): GameDefinition<T, S, Req> {
	return definition;
}
