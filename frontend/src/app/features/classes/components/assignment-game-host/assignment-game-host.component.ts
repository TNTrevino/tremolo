import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from "@angular/core";

import type { GameType } from "../../../../shared/models/game.models";
import { GAME_TYPE_LABELS } from "../../models/game-definitions";
import type { AssignmentLaunch } from "../../models/assignment-launch";

/**
 * **The handoff point between this slice and the game phases.**
 *
 * `AssignmentPlayPageComponent` does everything up to here: it resolves the
 * `:id`, finds the assignment in the student's list, handles not-found, and
 * hands over `gameType` plus the frozen `{ id, config }` launch. What
 * React did next was branch on the game type --
 *
 * ```tsx
 * assignment.gameType === "note"
 *   ? <NoteGamePage assignment={gameConfig} />
 *   : <IdentificationGamePage definition={…} assignment={gameConfig} />
 * ```
 *
 * -- and both of those pages are later phases: the identification shell is
 * Phase 5, the note game is Phase 6. Until they land this renders a plain
 * notice rather than a broken game.
 *
 * **Replacing it is a one-file change.** Swap the template below for that
 * branch; the inputs are already the props React passed, so nothing above
 * this component has to move. Do not "temporarily" reach past it from the
 * page -- the whole point of this component is that the page never has to
 * know which game shell exists.
 */
@Component({
	selector: "app-assignment-game-host",
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
	`,
	template: `
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
	`,
})
export class AssignmentGameHostComponent {
	readonly gameType = input.required<GameType>();
	readonly launch = input.required<AssignmentLaunch>();

	protected readonly gameLabel = computed(
		() => GAME_TYPE_LABELS[this.gameType()],
	);
}
