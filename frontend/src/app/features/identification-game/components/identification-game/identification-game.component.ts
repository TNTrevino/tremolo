import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	input,
	linkedSignal,
	signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { rxResource } from "@angular/core/rxjs-interop";
import { NgIcon } from "@ng-icons/core";
import { of } from "rxjs";

import { AuthStore } from "../../../../auth/services/auth.store";
import { LoggerService } from "@core/services/logger.service";
import { ButtonComponent } from "@shared/components/ui/button.component";
import { DIALOG_DIRECTIVES } from "@shared/components/ui/dialog.component";
import { MusicService } from "@shared/services/music.service";
import { UserService } from "@shared/services/user.service";

import type { GameDefinition } from "../../models/game-definition.models";
import {
	GameMode,
	type BaseGameSettings,
	type GeneratedQuestion,
} from "../../models/game-state.models";
import { GameScoreSaverService } from "../../services/game-score-saver.service";
import { GameStateService } from "../../services/game-state.service";
import { GameTimerService } from "../../services/game-timer.service";
import { GameModeLimitControlsComponent } from "../../settings/game-mode-limit-controls.component";
import { sanitizeConfig } from "../../settings/sanitize-config";
import { SettingsControlsComponent } from "../../settings/settings-controls.component";
import { AnswerPadComponent } from "../answer-pad/answer-pad.component";
import { GameOverCardComponent } from "../game-over-card/game-over-card.component";
import { QuestionBoardComponent } from "../question-board/question-board.component";
import { ScoreBarComponent } from "../score-bar/score-bar.component";

/**
 * The page shell every identification game runs on.
 *
 * Port of
 * frontend-react/src/features/identification-game/components/IdentificationGamePage.tsx.
 * Everything game-specific comes from the `GameDefinition`: the settings
 * schema and its persistence, question fetching, answer checking, and the
 * answer pad. Adding a game touches nothing in here.
 *
 * The component is generic so the four thin pages keep full inference on
 * their own definition -- `[definition]="keySignatureGame"` fixes `T`, `S`
 * and `Req` at the binding, and `settings` really is that game's settings
 * type inside this class.
 *
 * Three services are provided here rather than in root, because each is
 * this page's own state: the machine, its countdown, and its question
 * queue (which the board provides one level down).
 */
@Component({
	selector: "app-identification-game",
	imports: [
		AnswerPadComponent,
		ButtonComponent,
		...DIALOG_DIRECTIVES,
		GameModeLimitControlsComponent,
		GameOverCardComponent,
		NgIcon,
		QuestionBoardComponent,
		ScoreBarComponent,
		SettingsControlsComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [GameStateService, GameTimerService],
	styles: `
		:host {
			display: block;
		}
	`,
	templateUrl: "./identification-game.component.html",
})
export class IdentificationGameComponent<
	T extends GeneratedQuestion,
	S extends BaseGameSettings,
	Req,
> {
	private readonly auth = inject(AuthStore);
	private readonly logger = inject(LoggerService);
	private readonly music = inject(MusicService);
	private readonly users = inject(UserService);
	private readonly scoreSaver = inject(GameScoreSaverService);

	protected readonly game = inject(GameStateService);
	protected readonly timer = inject(GameTimerService);

	readonly definition = input.required<GameDefinition<T, S, Req>>();

	/**
	 * Assignment mode.
	 *
	 * When set, settings come from the assignment's frozen config instead of
	 * the student's own saved settings, the save-back is suppressed (playing
	 * an assignment must not overwrite what the student chose for
	 * themselves), and the attempt is tagged with the assignment id.
	 *
	 * Structurally the classes feature's `AssignmentLaunch`, spelled inline
	 * so the engine does not depend on that feature.
	 */
	readonly assignment = input<
		{ id: number; config: Record<string, unknown> } | undefined
	>(undefined);

	/** The live settings. Reset only if the definition itself changes. */
	protected readonly settings = linkedSignal(() => this.definition().defaults);

	protected readonly settingsOpen = signal(false);

	/**
	 * The student's saved config for this game.
	 *
	 * Fetch-on-load, no cache (D6). Skipped entirely in assignment mode and
	 * for anonymous players -- both would 401 or be ignored. Nothing gates a
	 * template on this resource's loading state and nothing reloads it, so
	 * the `isLoading()` trap recorded in STATE.md does not arise.
	 */
	private readonly savedSettings = rxResource({
		params: () => ({
			gameType: this.definition().gameType,
			enabled: !this.assignment() && this.auth.isAuthenticated(),
		}),
		stream: ({ params }) =>
			params.enabled ? this.users.getGameSettings(params.gameType) : of(null),
		defaultValue: null,
	});

	/**
	 * The request payload. **The queue keys on its serialization**, which is
	 * why only settings that reach `toRequest` reset the prefetch buffer.
	 */
	protected readonly request = computed(() =>
		this.definition().toRequest(this.settings()),
	);

	protected readonly answerOptions = computed(() =>
		this.definition().answerOptions(this.settings()),
	);

	protected readonly prompt = computed(
		() => this.definition().prompt?.(this.settings()) ?? null,
	);

	protected readonly columnsClassName = computed(
		() => this.definition().columnsClassName ?? "grid-cols-2",
	);

	protected readonly zoom = computed(() => this.definition().zoom ?? 1.4);

	/** Settings are configurable right up to the first answer, as in React. */
	protected readonly isConfigurable = computed(() => this.game.isReady());

	/** Applied once; a later refetch must not stomp a mid-game change. */
	private hydrated = false;

	constructor() {
		this.game.configure({
			settings: this.settings,
			onGameStart: () => this.onGameStart(),
			onGameEnd: (stats) =>
				this.scoreSaver.save(
					stats,
					this.definition().gameType,
					this.assignment()?.id,
				),
		});

		this.timer.expired
			.pipe(takeUntilDestroyed())
			.subscribe(() => this.game.endGame());

		effect(() => this.hydrateSettings());
	}

	/** The countdown's own formatter, handed to the score bar. */
	protected readonly formatTime = (seconds: number): string =>
		this.timer.format(seconds);

	protected updateSettings(patch: Record<string, unknown>): void {
		this.settings.update((current) => ({ ...current, ...patch }) as S);
	}

	protected onAnswer(guess: string): void {
		this.game.answer(guess);
	}

	protected onQuestionLoaded(answer: string): void {
		this.game.syncCurrentAnswer(answer);
	}

	protected playAgain(): void {
		this.game.reset();
		this.timer.reset();
	}

	/** Bound into the board; reads the *current* settings when it runs. */
	protected readonly getAnswer = (question: GeneratedQuestion): string =>
		this.definition().getAnswer(question as T, this.settings());

	/**
	 * Bound into the queue, and called outside any injection context --
	 * which is why the music service is passed rather than injected.
	 *
	 * The cast is the one place the definition's `Req` is erased: the board
	 * only ever hands back the payload this same definition produced.
	 */
	protected readonly fetchQuestion = (request: unknown) =>
		this.definition().fetchQuestion(request as Req, this.music);

	/**
	 * Applies a persisted config over the defaults, exactly once.
	 *
	 * Validated against the current schema first, so a renamed field or a
	 * dropped enum value in a config saved years ago falls back to the
	 * default instead of breaking the fetcher. In assignment mode the source
	 * is the assignment's frozen config. Either way it flows through the
	 * normal settings signal, so `toRequest` -- and therefore the queue's
	 * key -- sees it.
	 */
	private hydrateSettings(): void {
		if (this.hydrated) return;

		const config =
			this.assignment()?.config ?? this.savedSettings.value()?.config;
		if (!config) return;

		this.hydrated = true;
		this.updateSettings(
			sanitizeConfig<S>(this.definition().settingsSchema, config),
		);
	}

	/**
	 * The first answer starts the game: the countdown starts, and the
	 * settings the player is about to play with are persisted.
	 *
	 * `e2e/specs/settings.spec.ts` pins this timing on purpose -- "a port
	 * that saves on every click would pass this spec while hammering the
	 * API". Only the keys present in `defaults` are written, so stray state
	 * can never leak into the saved config.
	 */
	private onGameStart(): void {
		const current = this.settings();

		if (current.gameMode === GameMode.Time) {
			this.timer.start(current.timeLimit);
		}

		if (!this.auth.isAuthenticated() || this.assignment()) return;

		const defaults = this.definition().defaults;
		const config = Object.fromEntries(
			Object.keys(defaults).map((key) => [key, current[key as keyof S]]),
		);

		this.users
			.saveGameSettings({ gameType: this.definition().gameType, config })
			.subscribe({
				// React suppressed this mutation's error toast: a game that
				// cannot save its settings is still perfectly playable.
				error: (err: unknown) =>
					this.logger.warn("Failed to save game settings", err),
			});
	}
}
