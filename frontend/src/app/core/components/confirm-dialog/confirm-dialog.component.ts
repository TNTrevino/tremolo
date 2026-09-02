import {
	ChangeDetectionStrategy,
	Component,
	input,
	model,
	output,
} from "@angular/core";

import { ButtonComponent } from "../../../shared/components/ui/button.component";
import { DIALOG_DIRECTIVES } from "../../../shared/components/ui/dialog.component";

/**
 * Port of frontend-react/src/shared/components/ui/confirm-dialog.tsx.
 *
 * Confirm/cancel for destructive actions (archive, remove, delete).
 * Cancel is `outline`, confirm is `destructive` and shows its own loading
 * state while `pending`.
 *
 * `title` and `description` were `ReactNode` in React; they are strings
 * here. Nothing in the app passed markup through them, and turning
 * component-shaped data back into plain data is the same move D9 makes for
 * `GameDefinition`.
 *
 * It lives in `core/components/` rather than `shared/components/ui/`
 * because that is where PLAN.md 4 puts it (and where Phase 1 left the
 * folder), even though the packet lists it among the ui primitives.
 */
@Component({
	selector: "app-confirm-dialog",
	imports: [ButtonComponent, ...DIALOG_DIRECTIVES],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<app-dialog [(open)]="open">
			<div appDialogContent class="max-w-md">
				<div appDialogHeader>
					<h2 appDialogTitle class="font-display">{{ title() }}</h2>
				</div>
				<div class="p-6">
					<p class="text-sm text-muted-foreground">{{ description() }}</p>
				</div>
				<div appDialogFooter>
					<app-button
						variant="outline"
						[disabled]="pending()"
						(click)="open.set(false)"
					>
						Cancel
					</app-button>
					<app-button
						variant="destructive"
						[loading]="pending()"
						(click)="confirm.emit()"
					>
						{{ confirmLabel() }}
					</app-button>
				</div>
			</div>
		</app-dialog>
	`,
})
export class ConfirmDialogComponent {
	readonly open = model(false);
	readonly title = input.required<string>();
	readonly description = input.required<string>();
	readonly confirmLabel = input.required<string>();
	readonly pending = input(false);

	readonly confirm = output<void>();
}
