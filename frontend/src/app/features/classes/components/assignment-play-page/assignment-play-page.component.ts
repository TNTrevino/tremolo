import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { NgIcon } from "@ng-icons/core";

import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { SkeletonDirective } from "../../../../shared/components/ui/skeleton.directive";
import type { GameType } from "../../../../shared/models/game.models";
import type { StudentAssignment } from "../../models/classes.models";
import type { AssignmentLaunch } from "../../models/assignment-launch";
import { isKnownGameType } from "../../models/game-definitions";
import { ClassesService } from "../../services/classes.service";
import { AssignmentGameHostComponent } from "../assignment-game-host/assignment-game-host.component";

/**
 * `/assignments/:id/play` -- launches an assignment in "assignment mode".
 * Port of frontend-react/src/pages/AssignmentPlayPage.tsx.
 *
 * **There is no GET-by-id endpoint for an assignment**, so the assignment
 * is found in the student's own list -- which is also the authorisation
 * check: an assignment for a class the student is not in simply is not in
 * the list, and they get the not-found panel. React relied on exactly the
 * same thing.
 *
 * This slice owns everything up to the handoff: resolve, find, loading,
 * not-found, back link, and the frozen `{ id, config }` launch. The game
 * itself is behind `app-assignment-game-host` (Phases 5 and 6) -- see that
 * component's header.
 *
 * React needed a `useMemo` so the launch object kept a stable identity
 * across re-renders, because the game pages' effects keyed off it. A
 * `computed()` is stable by construction, so that concern has no port.
 */
@Component({
	selector: "app-assignment-play-page",
	imports: [
		AssignmentGameHostComponent,
		ButtonComponent,
		NgIcon,
		RouterLink,
		SkeletonDirective,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./assignment-play-page.component.html",
})
export class AssignmentPlayPageComponent {
	readonly id = input.required<string>();

	private readonly classesService = inject(ClassesService);

	readonly assignmentId = computed(() => Number(this.id()));

	readonly assignments = rxResource({
		stream: () => this.classesService.getStudentAssignments(),
		defaultValue: [] as StudentAssignment[],
	});

	private readonly assignment = computed(() => {
		const id = this.assignmentId();
		if (Number.isNaN(id)) return undefined;
		return this.assignments.value().find((a) => a.id === id);
	});

	/**
	 * Everything the game host needs, or `undefined` for the not-found panel.
	 *
	 * A `game_type` this build does not know is not-found, not a blank game.
	 * React got that for free -- it looked the type up in
	 * `GENERIC_GAME_DEFINITIONS` and fell through when the lookup missed --
	 * and since `game_type` is filled by the Go service, the `GameType` union
	 * is a claim about the wire, not a guarantee from it.
	 */
	readonly playable = computed<
		{ gameType: GameType; launch: AssignmentLaunch } | undefined
	>(() => {
		const assignment = this.assignment();
		if (!assignment) return undefined;
		if (!isKnownGameType(assignment.gameType)) return undefined;
		return {
			gameType: assignment.gameType,
			launch: { id: assignment.id, config: assignment.config },
		};
	});
}
