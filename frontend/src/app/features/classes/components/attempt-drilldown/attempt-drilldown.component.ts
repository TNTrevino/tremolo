import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { NgIcon } from "@ng-icons/core";

import { AppErrorComponent } from "../../../../core/components/app-error/app-error.component";
import { formatShortDate } from "../../../../shared/utils/date.utils";
import type { Attempt } from "../../models/classes.models";
import { ClassesService } from "../../services/classes.service";

/**
 * Port of
 * frontend-react/src/features/classes/components/AttemptDrilldown.tsx: the
 * inline panel a teacher opens on a student's row to see every attempt.
 *
 * React's `useAssignmentAttempts(..., enabled)` only fetched once the row
 * was expanded. There is no `enabled` flag to port: the component is only
 * *created* when the row is expanded (`@if` in the grid), so the resource
 * starts on creation and cancels on collapse. That is the same request
 * pattern, expressed by the component's lifetime instead of a flag.
 *
 * **One thing is not ported yet:** React drew a `TremoloLineChart` of
 * accuracy over time above the rows whenever there was more than one
 * attempt. The chart library is Phase 3 sub-feature 6's deferred decision
 * (PLAN.md §2), so `shared/components/charts/` does not exist. The rows
 * below are the whole panel until it does. Recorded in the sub-feature 5
 * handoff.
 *
 * DESIGN.md: kept off-brass on purpose -- the grid already spends brass on
 * best accuracy, so this panel stays ink/muted.
 */
@Component({
	selector: "app-attempt-drilldown",
	imports: [AppErrorComponent, NgIcon],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="rounded-lg bg-muted/30 px-2 py-3">
			@if (attempts.isLoading()) {
				<div class="flex items-center justify-center h-16">
					<ng-icon
						name="lucideLoader2"
						size="1.25rem"
						aria-hidden="true"
						class="animate-spin text-muted-foreground"
					/>
				</div>
			} @else if (attempts.error()) {
				<app-error [error]="attempts.error()" />
			} @else if (attempts.value().length === 0) {
				<p class="px-3 py-2 text-sm text-muted-foreground">No attempts yet.</p>
			} @else {
				<div class="space-y-3">
					<div class="divide-y divide-border/50">
						@for (attempt of attempts.value(); track $index) {
							<div
								class="grid grid-cols-[1fr_repeat(3,auto)] gap-4 items-center px-3 py-1.5 text-sm"
							>
								<span class="tabular-nums text-muted-foreground">{{
									shortDate(attempt)
								}}</span>
								<span class="tabular-nums text-right">
									{{ attempt.correctQuestions
									}}<span class="text-muted-foreground">
										/ {{ attempt.totalQuestions }}</span
									>
								</span>
								<span class="tabular-nums text-right font-medium"
									>{{ attempt.accuracy }}%</span
								>
								<span class="tabular-nums text-right text-muted-foreground"
									>{{ attempt.notesPerMinute }} npm</span
								>
							</div>
						}
					</div>
				</div>
			}
		</div>
	`,
})
export class AttemptDrilldownComponent {
	readonly assignmentId = input.required<number>();
	readonly studentId = input.required<number>();

	private readonly classesService = inject(ClassesService);

	readonly attempts = rxResource({
		params: () => ({
			assignmentId: this.assignmentId(),
			studentId: this.studentId(),
		}),
		stream: ({ params }) =>
			this.classesService.getAssignmentAttempts(
				params.assignmentId,
				params.studentId,
			),
		defaultValue: [] as Attempt[],
	});

	protected shortDate(attempt: Attempt): string {
		return formatShortDate(attempt.attemptedDate);
	}
}
