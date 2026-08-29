import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	signal,
} from "@angular/core";
import { Router } from "@angular/router";
import { NgIcon } from "@ng-icons/core";

import { ConfirmDialogComponent } from "../../../../core/components/confirm-dialog/confirm-dialog.component";
import { NotificationService } from "../../../../core/services/notification.service";
import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";
import { TooltipDirective } from "../../../../shared/components/ui/tooltip.directive";
import { ClipboardService } from "../../../../shared/services/clipboard.service";
import { getErrorMessage } from "../../../../shared/utils/error.utils";
import type { Class } from "../../models/classes.models";
import { ClassesService } from "../../services/classes.service";

/**
 * Port of frontend-react/src/features/classes/components/ClassHeader.tsx:
 * the class name, its roll count, the join code with a copy button, and the
 * archive action behind a confirm dialog.
 *
 * React's `ConfirmDialog` took a `ReactNode` description so it could bold
 * the class name inside the sentence. Phase 2's port takes a string (its
 * header records why), so the name is interpolated into the sentence
 * instead of being marked up -- the words are identical.
 */
@Component({
	selector: "app-class-header",
	imports: [
		ButtonComponent,
		ConfirmDialogComponent,
		NgIcon,
		TooltipDirective,
		...CARD_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	// React rendered this card's <div> straight into the page stack; Angular
	// interposes an <app-class-header> that React never had, and an unstyled
	// custom element is `display: inline` -- where vertical margins simply do
	// not apply. That silently ate the `space-y-6` between every card on
	// /classes/:id and /assignments. Same family as sub-feature 1's handoff
	// 7.3; every stacked component in this feature carries this.
	styles: `
		:host {
			display: block;
		}
	`,
	providers: [ClipboardService],
	templateUrl: "./class-header.component.html",
})
export class ClassHeaderComponent {
	readonly classItem = input.required<Class>();

	private readonly classesService = inject(ClassesService);
	private readonly notifications = inject(NotificationService);
	private readonly router = inject(Router);
	private readonly clipboard = inject(ClipboardService);

	readonly copied = this.clipboard.copied;
	readonly confirmOpen = signal(false);
	readonly pending = signal(false);

	readonly studentLabel = computed(() =>
		this.classItem().studentCount === 1 ? "student" : "students",
	);

	readonly archiveDescription = computed(
		() =>
			`This hides ${this.classItem().name} from everyone — students lose access and it can’t be undone from here. Existing data is kept.`,
	);

	copy(): void {
		this.clipboard.copy(this.classItem().joinCode);
	}

	archive(): void {
		if (this.pending()) return;
		this.pending.set(true);

		this.classesService.archiveClass(this.classItem().id).subscribe({
			next: () => {
				this.pending.set(false);
				this.confirmOpen.set(false);
				void this.router.navigateByUrl("/classes");
			},
			error: (err: unknown) => {
				this.pending.set(false);
				this.notifications.showError(
					getErrorMessage(err),
					"Failed to archive class",
				);
			},
		});
	}
}
