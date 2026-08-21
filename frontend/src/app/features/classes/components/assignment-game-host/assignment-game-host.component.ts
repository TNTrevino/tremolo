import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from "@angular/core";

import {
	chordGame,
	IdentificationGameComponent,
	intervalGame,
	keySignatureGame,
	scaleGame,
} from "@features/identification-game";

import { NoteGamePageComponent } from "@features/note-game/components/note-game-page/note-game-page.component";

import type { GameType } from "../../../../shared/models/game.models";
import { GAME_TYPE_LABELS } from "../../models/game-definitions";
import type { AssignmentLaunch } from "../../models/assignment-launch";

/**
 * **The handoff point between the classes slice and the game phases.**
 *
 * `AssignmentPlayPageComponent` does everything up to here: it resolves the
 * `:id`, finds the assignment in the student's list, handles not-found, and
 * hands over `gameType` plus the frozen `{ id, config }` launch. This
 * component is React's branch, and nothing else:
 *
 * ```tsx
 * assignment.gameType === "note"
 *   ? <NoteGamePage assignment={gameConfig} />
 *   : <IdentificationGamePage definition={…} assignment={gameConfig} />
 * ```
 *
 * Phase 5 filled in the four identification games and Phase 6 the note game,
 * so all five branches are real. The `@default` notice survives for a
 * `game_type` this build has never heard of -- an assignment created against
 * a newer backend -- which `isKnownGameType` normally catches upstream.
 *
 * The `@switch` is four explicit bindings rather than a lookup in
 * `GAME_DEFINITIONS`, deliberately: the shell is generic, and a concrete
 * binding is what lets the compiler check each definition against it. A
 * table lookup would need its types erased and would check nothing.
 *
 * The launch is passed straight through as the shell's `assignment` input,
 * which is what puts the game in assignment mode: settings come from the
 * frozen config rather than the student's own, the settings save-back is
 * suppressed, and the attempt is tagged with the assignment id.
 */
@Component({
	selector: "app-assignment-game-host",
	imports: [IdentificationGameComponent, NoteGamePageComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
			height: 100%;
		}
	`,
	template: `
		@switch (gameType()) {
			@case ("note") {
				<app-note-game-page [assignment]="launch()" />
			}
			@case ("key_signature") {
				<app-identification-game
					[definition]="keySignatureGame"
					[assignment]="launch()"
				/>
			}
			@case ("scale") {
				<app-identification-game
					[definition]="scaleGame"
					[assignment]="launch()"
				/>
			}
			@case ("chord") {
				<app-identification-game
					[definition]="chordGame"
					[assignment]="launch()"
				/>
			}
			@case ("interval") {
				<app-identification-game
					[definition]="intervalGame"
					[assignment]="launch()"
				/>
			}
			@default {
				<div
					class="flex h-full flex-col items-center justify-center gap-2 px-4 text-center"
				>
					<h1 class="font-display text-2xl font-bold">
						{{ gameLabel() }} practice
					</h1>
					<p class="max-w-md text-sm text-muted-foreground">
						This assignment is ready to play. The {{ gameLabel() }} game is not
						available in this build yet.
					</p>
				</div>
			}
		}
	`,
})
export class AssignmentGameHostComponent {
	readonly gameType = input.required<GameType>();
	readonly launch = input.required<AssignmentLaunch>();

	protected readonly keySignatureGame = keySignatureGame;
	protected readonly scaleGame = scaleGame;
	protected readonly chordGame = chordGame;
	protected readonly intervalGame = intervalGame;

	protected readonly gameLabel = computed(
		() => GAME_TYPE_LABELS[this.gameType()],
	);
}
