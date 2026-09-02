import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";

import { AppErrorComponent } from "../../../../core/components/app-error/app-error.component";
import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";
import { SkeletonDirective } from "../../../../shared/components/ui/skeleton.directive";
import type { StudentAssignment } from "../../models/classes.models";
import { ClassesService } from "../../services/classes.service";
import { AssignmentCardComponent } from "../assignment-card/assignment-card.component";

/**
 * Port of
 * frontend-react/src/features/classes/components/StudentAssignmentsList.tsx.
 *
 * **A note the parity suite carries a comment about.** In React, joining a
 * class did not refresh this list: TanStack had it cached and
 * `useJoinClass` only invalidated the *class* list, so new assignments
 * appeared on the next page load. `classes.spec.ts` reloads rather than
 * asserting either behaviour. Angular's resource has no cache (D6), so it
 * refetches whenever this component is created -- **do not add caching to
 * reproduce React's staleness.**
 */
@Component({
	selector: "app-student-assignments-list",
	imports: [
		AppErrorComponent,
		AssignmentCardComponent,
		SkeletonDirective,
		...CARD_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
	`,
	template: `
		<div appCard>
			<div appCardHeader>
				<h3 appCardTitle className="font-display text-2xl">My Assignments</h3>
			</div>
			<div appCardContent>
				@if (assignments.isLoading()) {
					<div class="space-y-2">
						@for (i of skeletons; track i) {
							<div appSkeleton class="h-16 w-full"></div>
						}
					</div>
				} @else if (assignments.error()) {
					<app-error
						[error]="assignments.error()"
						fallback="Failed to load assignments."
					/>
				} @else if (assignments.value().length === 0) {
					<p class="py-8 text-center text-sm text-muted-foreground">
						No assignments yet. Join a class to get assignments.
					</p>
				} @else {
					<div class="divide-y divide-border">
						@for (assignment of assignments.value(); track assignment.id) {
							<app-assignment-card [assignment]="assignment" />
						}
					</div>
				}
			</div>
		</div>
	`,
})
export class StudentAssignmentsListComponent {
	private readonly classesService = inject(ClassesService);

	readonly assignments = rxResource({
		stream: () => this.classesService.getStudentAssignments(),
		defaultValue: [] as StudentAssignment[],
	});

	protected readonly skeletons = [0, 1, 2];
}
