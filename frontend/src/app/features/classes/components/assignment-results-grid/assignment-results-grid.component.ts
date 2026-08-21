import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
	signal,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { NgIcon } from "@ng-icons/core";

import { AppErrorComponent } from "../../../../core/components/app-error/app-error.component";
import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";
import { cn } from "../../../../shared/utils/cn";
import type { Assignment, AssignmentResult } from "../../models/classes.models";
import { ClassesService } from "../../services/classes.service";
import { AttemptDrilldownComponent } from "../attempt-drilldown/attempt-drilldown.component";
import { ClassInsightTilesComponent } from "../class-insight-tiles/class-insight-tiles.component";

/** The five-column track shared by the header row and every result row. */
const COLS = "grid grid-cols-[1.6fr_repeat(4,1fr)] gap-2 items-center";

/**
 * Port of
 * frontend-react/src/features/classes/components/AssignmentResultsGrid.tsx:
 * one row per enrolled student, expandable into that student's attempt
 * history.
 *
 * Two behaviours the React tests pin and this keeps:
 *
 * - A zero-attempt student is a plain `div` reading "Not started", **not** a
 *   button -- there is nothing to expand, so it must not be reachable by
 *   keyboard as though there were.
 * - The drill-down is not rendered, and therefore not fetched, until its row
 *   is expanded.
 */
@Component({
	selector: "app-assignment-results-grid",
	imports: [
		AppErrorComponent,
		AttemptDrilldownComponent,
		ClassInsightTilesComponent,
		NgIcon,
		...CARD_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./assignment-results-grid.component.html",
})
export class AssignmentResultsGridComponent {
	readonly assignment = input.required<Assignment>();

	private readonly classesService = inject(ClassesService);

	readonly results = rxResource({
		params: () => this.assignment().id,
		stream: ({ params }) => this.classesService.getAssignmentResults(params),
		defaultValue: [] as AssignmentResult[],
	});

	readonly expandedStudentId = signal<number | null>(null);

	protected readonly cols = COLS;
	protected readonly headerClasses = cn(
		COLS,
		"px-3 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground",
	);
	protected readonly notStartedClasses = cn(
		COLS,
		"px-3 py-2 rounded-lg text-muted-foreground",
	);
	protected readonly rowButtonClasses = cn(
		COLS,
		"w-full px-3 py-2 rounded-lg transition-colors hover:bg-accent/50 text-left",
	);

	/** A student with no attempt at all -- either counter can say so. */
	notStarted(row: AssignmentResult): boolean {
		return row.attemptCount === 0 || row.lastAttemptDate === "";
	}

	fullName(row: AssignmentResult): string {
		return `${row.firstName} ${row.lastName}`;
	}

	/** Clamped so a bad number from the server cannot overflow the meter. */
	accuracyWidth(row: AssignmentResult): string {
		return `${Math.min(100, Math.max(0, row.bestAccuracy))}%`;
	}

	toggle(row: AssignmentResult): void {
		this.expandedStudentId.update((current) =>
			current === row.studentId ? null : row.studentId,
		);
	}
}
