import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	input,
	untracked,
} from "@angular/core";
import { rxResource, takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { NgTemplateOutlet } from "@angular/common";

import { AuthStore } from "../../../../auth/services/auth.store";
import { BreakpointService } from "../../../../shared/services/breakpoint.service";
import type { NoteGameSettings } from "../../../../shared/models/game.models";
import { UserService } from "../../../../shared/services/user.service";
import { GameMode, GameState } from "../../models/engine.models";
import {
	keyBindingsToNoteMap,
	noteMapToKeyBindings,
	DEFAULT_NOTE_TO_KEY_MAP,
} from "../../models/keymap";
import type { GameSettings } from "../../models/note-game.models";
import { GameTimerService } from "../../services/game-timer.service";
import { NoteGameService } from "../../services/note-game.service";
import { SaveGameOnEndService } from "../../services/save-game-on-end.service";
import {
	NoteGameBoardComponent,
	NoteGameBoardLandscapeComponent,
} from "../note-game-board/note-game-board.component";
import { NoteGameResultsComponent } from "../note-game-results/note-game-results.component";
import { ScoreBarComponent } from "../score-bar/score-bar.component";
import { SettingsBarComponent } from "../settings-bar/settings-bar.component";

/**
 * Note Recognition Game. Port of
 * frontend-react/src/pages/NoteGamePage.tsx.
 *
 * The orchestrator: it owns the three services the game needs, hydrates the
 * settings, and swaps between the settings bar, the score bar and the results
 * screen. Everything else is delegated.
 *
 * **Settings are persisted when the game starts, not when a control is
 * clicked.** That is `settings.spec.ts`'s golden flow, stated in its own
 * header: a port that saved on every click would pass the spec while
 * hammering the API. `NoteGameService.started` fires synchronously inside the
 * first answer, which is where both the save and the countdown begin.
 *
 * **`octave` is read and written but never acted on.** It rides through
 * `mapSavedSettings` and back out in the save so a row written before the
 * range picker existed still loads; the range is what plays
 * (`frontend/CLAUDE.md`).
 */
@Component({
	selector: "app-note-game-page",
	imports: [
		NgTemplateOutlet,
		NoteGameBoardComponent,
		NoteGameBoardLandscapeComponent,
		NoteGameResultsComponent,
		ScoreBarComponent,
		SettingsBarComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [NoteGameService, GameTimerService, SaveGameOnEndService],
	styles: `
		:host {
			display: block;
		}
	`,
	templateUrl: "./note-game-page.component.html",
})
export class NoteGamePageComponent {
	private readonly users = inject(UserService);
	private readonly auth = inject(AuthStore);
	private readonly timer = inject(GameTimerService);
	private readonly saver = inject(SaveGameOnEndService);

	protected readonly game = inject(NoteGameService);
	protected readonly breakpoints = inject(BreakpointService);

	/**
	 * Assignment mode: settings come from the assignment's frozen config
	 * instead of the student's saved row, the settings save-back is
	 * suppressed, and the finished attempt is tagged with the assignment id.
	 *
	 * Nothing routes to this yet -- `AssignmentGameHostComponent` still
	 * renders its stub, because Phase 5 owns that file too and both game
	 * shells land in it at the merge. See the handoff.
	 */
	readonly assignment = input<{
		id: number;
		config: Partial<NoteGameSettings>;
	}>();

	protected readonly states = GameState;
	protected readonly isAuthenticated = this.auth.isAuthenticated;

	protected readonly timeRemaining = this.timer.timeRemaining;
	protected readonly formatTime = (seconds: number): string =>
		this.timer.formatTime(seconds);
	protected readonly saveError = this.saver.saveError;

	/** `null` (or a 404) means "nothing saved yet", not an error. */
	private readonly savedSettings = rxResource({
		params: () =>
			this.assignment() === undefined && this.auth.isAuthenticated()
				? this.auth.user()?.id
				: undefined,
		stream: () => this.users.getNoteGameSettings(),
	});

	private readonly savedBindings = rxResource({
		params: () =>
			this.auth.isAuthenticated() ? this.auth.user()?.id : undefined,
		stream: () => this.users.getKeyboardBindings(),
	});

	/** Note -> key, for the answer-pad hints and the bindings dialog. */
	protected readonly noteToKeyMap = computed(() => {
		const saved = this.savedBindings.value();
		return saved
			? keyBindingsToNoteMap(saved.keyBindings)
			: DEFAULT_NOTE_TO_KEY_MAP;
	});

	protected readonly range = computed(() => {
		const settings = this.game.settings();
		return {
			lowNote: settings.lowNote,
			highNote: settings.highNote,
			clef: settings.clef,
		};
	});

	protected readonly answersLength = computed(() => this.game.answers().length);

	/** Guards the assignment hydration: apply its frozen config exactly once. */
	private assignmentApplied = false;

	constructor() {
		// The timer ends the game; the game's start starts the timer. React
		// broke that circle with `endGameRef`; two subscriptions do it here.
		this.timer.expired
			.pipe(takeUntilDestroyed())
			.subscribe(() => this.game.endGame());

		this.game.started
			.pipe(takeUntilDestroyed())
			.subscribe(() => this.onStart());

		this.game.ended
			.pipe(takeUntilDestroyed())
			.subscribe((stats) =>
				this.saver.handleGameEnd(stats, "note", this.assignment()?.id),
			);

		// Custom bindings feed the keydown stream.
		effect(() => {
			const saved = this.savedBindings.value();
			untracked(() =>
				this.game.keyBindings.set(
					saved ? keyBindingsToNoteMap(saved.keyBindings) : undefined,
				),
			);
		});

		// Hydrate from the assignment's frozen config, or the player's saved
		// row. Both are the same shape; per-field guards let a partial or
		// hand-edited config degrade rather than clobber a field with
		// undefined.
		effect(() => {
			const assignment = this.assignment();
			if (assignment) {
				if (this.assignmentApplied) return;
				this.assignmentApplied = true;
				untracked(() =>
					this.game.updateSettings(mapSavedSettings(assignment.config)),
				);
				return;
			}

			const saved = this.savedSettings.value();
			if (!saved) return;
			untracked(() => this.game.updateSettings(mapSavedSettings(saved)));
		});
	}

	protected onAnswer(answer: string): void {
		this.game.handleAnswer(answer);
	}

	protected onQuestionLoaded(noteName: string): void {
		this.game.syncCurrentNote(noteName);
	}

	protected onSettingsChange(patch: Partial<GameSettings>): void {
		this.game.updateSettings(patch);
	}

	protected onPlayAgain(): void {
		this.timer.resetTimer();
		this.saver.reset();
		this.game.resetGame();
	}

	protected onBindingsOpenChange(open: boolean): void {
		this.game.inputDisabled.set(open);
	}

	protected onSaveBindings(noteToKey: Record<string, string>): void {
		this.users
			.saveKeyboardBindings(noteMapToKeyBindings(noteToKey))
			.subscribe(() => this.savedBindings.reload());
	}

	/** The first answer: start the clock, and commit the settings played with. */
	private onStart(): void {
		const settings = this.game.settings();

		if (settings.gameMode === GameMode.Time) {
			this.timer.startTimer(settings.timeLimit);
		}

		// Playing an assignment must never overwrite the student's own
		// settings.
		if (!this.auth.isAuthenticated() || this.assignment()) return;

		this.users
			.saveNoteGameSettings({
				gameMode: settings.gameMode,
				timeLimit: settings.timeLimit,
				noteLimit: settings.noteLimit,
				scale: settings.scale,
				octave: settings.octave,
				lowNote: settings.lowNote,
				highNote: settings.highNote,
				clef: settings.clef,
			})
			.subscribe({
				// Fire and forget, as React's mutation was: a failed settings
				// save must not interrupt the game that just started.
				error: () => undefined,
			});
	}
}

/**
 * A saved (or assignment-frozen) settings row as a settings patch.
 *
 * Per-field guards, ported from React's `mapNoteConfigToSettings`: a row that
 * predates a field -- or an assignment config someone edited by hand -- must
 * leave that setting at its default rather than set it to `undefined`.
 *
 * `octave` is copied through deliberately. It does nothing, and a row saved
 * before the range picker existed still has to load (`frontend/CLAUDE.md`).
 */
function mapSavedSettings(
	saved: Partial<NoteGameSettings>,
): Partial<GameSettings> {
	const patch: Partial<GameSettings> = {};
	if (saved.gameMode !== undefined) patch.gameMode = saved.gameMode as GameMode;
	if (saved.timeLimit !== undefined) patch.timeLimit = saved.timeLimit;
	if (saved.noteLimit !== undefined) patch.noteLimit = saved.noteLimit;
	if (saved.scale !== undefined) patch.scale = saved.scale;
	if (saved.octave !== undefined) patch.octave = saved.octave;
	if (saved.lowNote !== undefined) patch.lowNote = saved.lowNote;
	if (saved.highNote !== undefined) patch.highNote = saved.highNote;
	if (saved.clef !== undefined) patch.clef = saved.clef;
	return patch;
}

/** Exported for the spec: the mapping is where a legacy row is honoured. */
export { mapSavedSettings as mapSavedNoteGameSettings };
