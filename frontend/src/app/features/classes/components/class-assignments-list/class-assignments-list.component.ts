import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	output,
	signal,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { NgIcon } from "@ng-icons/core";

import { AppErrorComponent } from "../../../../core/components/app-error/app-error.component";
import { ConfirmDialogComponent } from "../../../../core/components/confirm-dialog/confirm-dialog.component";
import { NotificationService } from "../../../../core/services/notification.service";
import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";
import { cn } from "../../../../shared/utils/cn";
import { formatDate } from "../../../../shared/utils/date.utils";
import { getErrorMessage } from "../../../../shared/utils/error.utils";
import { GAME_TYPE_LABELS } from "../../models/game-definitions";
import type { Assignment } from "../../models/classes.models";
import { ClassesService } from "../../services/classes.service";
import { CreateAssignmentDialogComponent } from "../create-assignment-dialog/create-assignment-dialog.component";

/**
 * Port of
 * frontend-react/src/features/classes/components/ClassAssignmentsList.tsx:
 * the class's assignments, one selectable row each, plus create and delete.
 *
 * Selecting a row is what reveals the results grid, so the selection lives
 * on the page (`selectedId` in, `assignmentSelected` out) exactly as it did
 * in React -- named the long way because `select` is a DOM event and
 * `@angular-eslint/no-output-native` rightly refuses it.
 * Deleting the selected assignment clears that selection -- React left it
 * pointing at a row that no longer existed, and the grid then fetched
 * results for a deleted id.
 *
 * As in the roster, per-row confirm state is one signal and one dialog
 * rather than a component per row.
 */
@Component({
	selector: "app-class-assignments-list",
	imports: [
		AppErrorComponent,
		ButtonComponent,
		ConfirmDialogComponent,
		CreateAssignmentDialogComponent,
		NgIcon,
		...CARD_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
	`,
	templateUrl: "./class-assignments-list.component.html",
})
export class ClassAssignmentsListComponent {
	readonly classId = input.required<number>();
	readonly selectedId = input<number | null>(null);

	readonly assignmentSelected = output<Assignment>();
	/** Raised when the selected assignment vanished under the selection. */
	readonly selectionCleared = output<void>();

	private readonly classesService = inject(ClassesService);
	private readonly notifications = inject(NotificationService);

	readonly assignments = rxResource({
		params: () => this.classId(),
		stream: ({ params }) => this.classesService.getClassAssignments(params),
		defaultValue: [] as Assignment[],
	});

	readonly isCreateOpen = signal(false);
	readonly confirming = signal<Assignment | null>(null);
	readonly pending = signal(false);

	readonly confirmDescription = computed(() => {
		const assignment = this.confirming();
		if (!assignment) return "";
		return `Delete ${assignment.title}? Student attempts for it will no longer be tracked.`;
	});

	/**
	 * "Key Signature · Due Jul 20, 2026 · 20 questions, 80% accuracy" --
	 * the same three optional segments React joined with " · ".
	 */
	subtitle(assignment: Assignment): string {
		const targets: string[] = [];
		if (assignment.targetQuestions != null) {
			targets.push(`${assignment.targetQuestions} questions`);
		}
		if (assignment.targetAccuracy != null) {
			targets.push(`${assignment.targetAccuracy}% accuracy`);
		}

		const due = formatDate(assignment.dueAt);
		return (
			GAME_TYPE_LABELS[assignment.gameType] +
			(due ? ` · Due ${due}` : "") +
			(targets.length > 0 ? ` · ${targets.join(", ")}` : "")
		);
	}

	rowClasses(assignment: Assignment): string {
		return cn(
			"flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
			assignment.id === this.selectedId()
				? "bg-primary text-primary-foreground"
				: "hover:bg-accent/50",
		);
	}

	subtitleClasses(assignment: Assignment): string {
		return cn(
			"text-xs truncate",
			assignment.id === this.selectedId()
				? "text-primary-foreground/70"
				: "text-muted-foreground",
		);
	}

	deleteButtonClasses(assignment: Assignment): string {
		return assignment.id === this.selectedId()
			? "text-primary-foreground hover:bg-primary-foreground/10"
			: "text-muted-foreground hover:text-destructive";
	}

	onRowKeydown(event: KeyboardEvent, assignment: Assignment): void {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			this.assignmentSelected.emit(assignment);
		}
	}

	confirmOpenChange(open: boolean): void {
		if (!open) this.confirming.set(null);
	}

	onCreated(): void {
		this.assignments.reload();
	}

	remove(): void {
		const assignment = this.confirming();
		if (!assignment || this.pending()) return;
		this.pending.set(true);

		this.classesService.deleteAssignment(assignment.id).subscribe({
			next: () => {
				this.pending.set(false);
				this.confirming.set(null);
				if (assignment.id === this.selectedId()) this.selectionCleared.emit();
				this.assignments.reload();
			},
			error: (err: unknown) => {
				this.pending.set(false);
				this.notifications.showError(
					getErrorMessage(err),
					"Failed to delete assignment",
				);
			},
		});
	}
}
