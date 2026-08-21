import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { cn } from "../../../../shared/utils/cn";
import type { StudentAssignment } from "../../models/classes.models";

/**
 * Whether the student's best accuracy has met the assignment's target.
 * Targets are advisory -- this is a purely client-side computation, the
 * backend never grades against `target_accuracy`.
 */
export function hasMetTarget(assignment: StudentAssignment): boolean | null {
	if (assignment.targetAccuracy == null) return null;
	return assignment.bestAccuracy >= assignment.targetAccuracy;
}

/**
 * The due date on a student's card, in US long-ish form ("Jul 20, 2026").
 *
 * Deliberately **not** `formatDate()` from `shared/utils/date.utils`: React
 * pinned this one to `en-US` while the teacher-side list used the system
 * locale, and one of them being locale-independent is what its test's
 * `/Due Jul/` assertion relies on. Carried over rather than unified.
 */
function formatDueDate(dueAt: string | null): string | null {
	if (!dueAt) return null;
	return new Date(dueAt).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/**
 * Port of frontend-react/src/features/classes/components/AssignmentCard.tsx:
 * one assigned practice item on the student's list, with its progress and
 * the Practice CTA.
 *
 * The parity suite reads "No attempts yet" and "1 attempt" off this card
 * and clicks its "Practice" button, so the progress line's exact wording
 * and the CTA's label are both contracts.
 */
@Component({
	selector: "app-assignment-card",
	imports: [ButtonComponent, RouterLink],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div
			class="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent/50"
		>
			<div class="min-w-0 flex-1 space-y-1">
				<div class="flex flex-wrap items-center gap-2">
					<span class="truncate text-sm font-medium">{{
						assignment().title
					}}</span>
					@if (metTarget() !== null) {
						<span [class]="badgeClasses()">{{ badgeLabel() }}</span>
					}
				</div>
				<p class="truncate text-xs text-muted-foreground">{{ subtitle() }}</p>
				<p class="text-xs tabular-nums text-muted-foreground">
					{{ progress() }}
				</p>
			</div>
			<a [routerLink]="playLink()" class="shrink-0">
				<app-button variant="default" size="sm">Practice</app-button>
			</a>
		</div>
	`,
})
export class AssignmentCardComponent {
	readonly assignment = input.required<StudentAssignment>();

	protected readonly metTarget = computed(() =>
		hasMetTarget(this.assignment()),
	);

	protected readonly playLink = computed(() => [
		"/assignments",
		this.assignment().id,
		"play",
	]);

	protected readonly badgeLabel = computed(() =>
		this.metTarget()
			? "Target met"
			: `Target ${this.assignment().targetAccuracy}%`,
	);

	protected readonly badgeClasses = computed(() =>
		cn(
			"rounded-full px-2 py-0.5 text-xs font-medium",
			this.metTarget()
				? "bg-correct/15 text-correct"
				: "bg-muted text-muted-foreground",
		),
	);

	protected readonly subtitle = computed(() => {
		const assignment = this.assignment();
		const due = formatDueDate(assignment.dueAt);
		return assignment.className + (due ? ` · Due ${due}` : "");
	});

	protected readonly progress = computed(() => {
		const assignment = this.assignment();
		if (assignment.attemptCount === 0) return "No attempts yet";
		const plural = assignment.attemptCount === 1 ? "" : "s";
		return `${assignment.attemptCount} attempt${plural} · best ${assignment.bestCorrect} correct · ${assignment.bestAccuracy}% accuracy`;
	});
}
