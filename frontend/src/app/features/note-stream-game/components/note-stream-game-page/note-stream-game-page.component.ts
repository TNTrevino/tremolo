import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	untracked,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";

import { GameTimerService } from "@features/identification-game";
import { keyBindingsToNoteMap } from "@features/note-game/models/keymap";

import { AuthStore } from "../../../../auth/services/auth.store";
import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { CardDirective } from "../../../../shared/components/ui/card.directive";
import { UserService } from "../../../../shared/services/user.service";
import {
	SESSION_LENGTHS,
	TEMPO_CHOICES,
	type NoteStreamSettings,
	type StreamJudgment,
} from "../../models/note-stream.models";
import { NoteSpawnerService } from "../../services/note-spawner.service";
import { NoteStreamGameService } from "../../services/note-stream-game.service";
import { StreamScoreService } from "../../services/stream-score.service";
import { StreamTransportService } from "../../services/stream-transport.service";
import { StreamHudComponent } from "../stream-hud/stream-hud.component";
import { StreamResultsComponent } from "../stream-results/stream-results.component";
import { StreamStaffComponent } from "../stream-staff/stream-staff.component";

/**
 * Note Stream Game -- routed page.
 *
 * The orchestrator, in the shape `NoteGamePageComponent` set: it owns the
 * five services the game needs (the composition root plus the four engine
 * services it composes -- `NoteStreamGameService` re-exposes them, but each
 * still needs its own provider so DI can construct the graph), hydrates the
 * player's saved keyboard bindings, and swaps between the ready screen, the
 * live session and the results screen. The design record is
 * docs/superpowers/specs/2026-08-30-note-stream-game-design.md.
 *
 * **`getCurrentBeat` is also what ticks the engine.** `StreamStaffComponent`
 * already runs the only `requestAnimationFrame` loop this page needs, so
 * rather than start a second one, the function it calls every frame calls
 * `game.tick()` first and returns the beat the transport lands on. A second
 * loop here would be a second place a frame could be dropped, and the two
 * would disagree in a backgrounded tab.
 *
 * **Bindings load exactly the way `NoteGamePageComponent` does.**
 * `savedBindings.value()` rethrows on a failed fetch, and this effect reads
 * it, so the same `error()` guard applies -- an anonymous visitor or a
 * bindings-fetch failure both fall through to `undefined`, which
 * `NoteStreamGameService.keyToNoteMap` already treats as "use the defaults".
 */
@Component({
	selector: "app-note-stream-game-page",
	imports: [
		ButtonComponent,
		CardDirective,
		StreamHudComponent,
		StreamResultsComponent,
		StreamStaffComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		NoteStreamGameService,
		StreamTransportService,
		NoteSpawnerService,
		StreamScoreService,
		GameTimerService,
	],
	host: {
		"(document:keydown)": "onDocumentKeydown($event)",
		"(document:visibilitychange)": "onVisibilityChange()",
	},
	styles: `
		:host {
			display: block;
		}
	`,
	templateUrl: "./note-stream-game-page.component.html",
})
export class NoteStreamGamePageComponent {
	private readonly auth = inject(AuthStore);
	private readonly users = inject(UserService);
	private readonly timer = inject(GameTimerService);

	protected readonly game = inject(NoteStreamGameService);

	protected readonly tempoChoices = TEMPO_CHOICES;
	protected readonly sessionLengths = SESSION_LENGTHS;

	protected readonly settings = this.game.settings;
	protected readonly secondsRemaining = this.game.secondsRemaining;

	protected readonly formatTime = (seconds: number): string =>
		this.timer.format(seconds);

	/** Drives the staff's scroll: countIn and playing both animate. */
	protected readonly isRunning = computed(() => {
		const phase = this.game.phase();
		return phase === "countIn" || phase === "playing";
	});

	/**
	 * Handed to `<app-stream-staff>` as a stable function, service-free.
	 * The `judgedVersion` read is the point: the staff's template calls this
	 * while rendering, so tracking the version signal is what repaints a
	 * note's hit/miss flash on the frame it was judged -- the note list
	 * itself only changes about once a beat.
	 */
	protected readonly judgmentFor = (id: number): StreamJudgment | undefined => {
		this.game.score.judgedVersion();
		return this.game.score.judgmentFor(id);
	};

	/**
	 * The staff's per-frame clock read. It ticks the engine first -- see the
	 * class doc -- then reports the beat the tick landed on, so the scroll
	 * and the judgment never see two different beats for one frame.
	 */
	protected readonly getCurrentBeat = (): number => {
		this.game.tick(performance.now());
		return this.game.transport.currentBeat();
	};

	/** `null` (a 404, or an anonymous visitor) means "use the default map". */
	private readonly savedBindings = rxResource({
		params: () =>
			this.auth.isAuthenticated() ? this.auth.user()?.id : undefined,
		stream: () => this.users.getKeyboardBindings(),
	});

	constructor() {
		// Same guard as `NoteGamePageComponent.noteToKeyMap`: `value()`
		// rethrows once the resource has errored, and this is a view effect,
		// so an unguarded read would crash the ready screen over a bindings
		// hiccup rather than just falling back to the default key map.
		effect(() => {
			const saved = this.savedBindings.error()
				? null
				: this.savedBindings.value();
			untracked(() => {
				this.game.keyBindings.set(
					saved ? keyBindingsToNoteMap(saved.keyBindings) : undefined,
				);
				this.game.overlapAccidentals.set(saved?.overlapAccidentals ?? false);
			});
		});
	}

	protected onSettingsChange(patch: Partial<NoteStreamSettings>): void {
		this.game.updateSettings(patch);
	}

	/** Still inside the click handler -- `startGame()` wants the gesture. */
	protected onPlayAgain(): void {
		this.game.reset();
		this.game.startGame();
	}

	protected onChangeSettings(): void {
		this.game.reset();
	}

	protected onDocumentKeydown(event: KeyboardEvent): void {
		if (event.key !== "Escape") return;
		this.game.pause();
	}

	protected onVisibilityChange(): void {
		if (document.visibilityState === "hidden") this.game.pause();
	}
}
