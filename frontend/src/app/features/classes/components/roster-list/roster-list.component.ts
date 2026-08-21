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
import { formatDate } from "../../../../shared/utils/date.utils";
import { getErrorMessage } from "../../../../shared/utils/error.utils";
import type { RosterEntry } from "../../models/classes.models";
import { ClassesService } from "../../services/classes.service";

/**
 * Port of frontend-react/src/features/classes/components/RosterList.tsx --
 * who is enrolled, and the remove-student action.
 *
 * React gave each row its own `RosterRow` component purely so the row could
 * own a `useState` for its confirm dialog. Signals do not need a component
 * to hold state, so the list keeps one `confirming` signal naming the row
 * being confirmed and renders **one** dialog. Same behaviour, one component
 * instead of two, and only one dialog in the DOM.
 *
 * Removing a student refetches the roster and tells the parent, because the
 * class's `student_count` on the header changed too -- the two
 * `invalidateQueries` calls React's `useRemoveStudent` made.
 */
@Component({
	selector: "app-roster-list",
	imports: [
		AppErrorComponent,
		ButtonComponent,
		ConfirmDialogComponent,
		NgIcon,
		...CARD_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./roster-list.component.html",
})
export class RosterListComponent {
	readonly classId = input.required<number>();

	/** Raised when the roll changed, so the class header can refetch. */
	readonly rosterChanged = output<void>();

	private readonly classesService = inject(ClassesService);
	private readonly notifications = inject(NotificationService);

	readonly roster = rxResource({
		params: () => this.classId(),
		stream: ({ params }) => this.classesService.getClassRoster(params),
		defaultValue: [] as RosterEntry[],
	});

	readonly confirming = signal<RosterEntry | null>(null);
	readonly pending = signal(false);

	readonly confirmDescription = computed(() => {
		const entry = this.confirming();
		if (!entry) return "";
		return `Remove ${entry.firstName} ${entry.lastName} from this class? They can rejoin later with the class code.`;
	});

	joinedLabel(entry: RosterEntry): string {
		return `Joined ${formatDate(entry.joinedAt)}`;
	}

	fullName(entry: RosterEntry): string {
		return `${entry.firstName} ${entry.lastName}`;
	}

	confirmOpenChange(open: boolean): void {
		if (!open) this.confirming.set(null);
	}

	remove(): void {
		const entry = this.confirming();
		if (!entry || this.pending()) return;
		this.pending.set(true);

		this.classesService
			.removeStudent(this.classId(), entry.studentId)
			.subscribe({
				next: () => {
					this.pending.set(false);
					this.confirming.set(null);
					this.roster.reload();
					this.rosterChanged.emit();
				},
				error: (err: unknown) => {
					this.pending.set(false);
					this.notifications.showError(
						getErrorMessage(err),
						"Failed to remove student",
					);
				},
			});
	}
}
