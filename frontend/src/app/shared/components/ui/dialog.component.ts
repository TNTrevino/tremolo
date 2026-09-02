import {
	ChangeDetectionStrategy,
	Component,
	Directive,
	effect,
	model,
} from "@angular/core";

/**
 * Port of frontend-react/src/shared/components/ui/dialog.tsx.
 *
 * ```html
 * <app-dialog [(open)]="confirming">
 *   <div appDialogContent class="max-w-md">
 *     <div appDialogHeader><h2 appDialogTitle>Archive class</h2></div>
 *     …
 *     <div appDialogFooter>…</div>
 *   </div>
 * </app-dialog>
 * ```
 *
 * Three differences from React, all recorded in the phase handoff:
 *
 * 1. **No portal.** React rendered through `createPortal(..., document.body)`
 *    to escape stacking contexts. Angular has no portal without
 *    `@angular/cdk`, which is a dependency this phase is not adding, so the
 *    overlay renders in place -- `fixed inset-0 z-50` still covers the
 *    viewport, and the host is `display: contents` so it contributes no box
 *    of its own.
 * 2. `open` is a two-way `model()`, so `[(open)]` replaces the
 *    `open` + `onOpenChange` pair.
 * 3. Escape is handled once, here, instead of by a `document` listener
 *    installed by `DialogContent`.
 */
@Component({
	selector: "app-dialog",
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	host: { "(document:keydown)": "onDocumentKeydown($event)" },
	template: `
		@if (open()) {
			<div
				role="button"
				tabindex="-1"
				class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
				(click)="onOverlayClick($event)"
				(keydown)="onOverlayKeydown($event)"
			>
				<ng-content />
			</div>
		}
	`,
})
export class DialogComponent {
	readonly open = model(false);

	constructor() {
		// React did this in a `useEffect` with a cleanup that always removed
		// the class; an effect() with the same unconditional else-branch is
		// the direct equivalent, and the component being destroyed while open
		// is handled by the destroy hook below.
		effect((onCleanup) => {
			const isOpen = this.open();
			document.body.classList.toggle("overflow-hidden", isOpen);
			onCleanup(() => document.body.classList.remove("overflow-hidden"));
		});
	}

	close(): void {
		this.open.set(false);
	}

	protected onOverlayClick(event: MouseEvent): void {
		if (event.target === event.currentTarget) this.close();
	}

	protected onOverlayKeydown(event: KeyboardEvent): void {
		if (event.key === "Escape") this.close();
	}

	protected onDocumentKeydown(event: KeyboardEvent): void {
		if (this.open() && event.key === "Escape") this.close();
	}
}

@Directive({
	selector: "[appDialogContent]",
	host: {
		role: "dialog",
		"aria-modal": "true",
		class:
			"max-w-2xl w-full mx-4 rounded-lg border border-border bg-background text-foreground shadow-lg",
	},
})
export class DialogContentDirective {}

@Directive({
	selector: "[appDialogHeader]",
	host: { class: "flex flex-col space-y-1.5 border-b border-border p-6" },
})
export class DialogHeaderDirective {}

@Directive({
	selector: "[appDialogTitle]",
	host: { class: "text-lg font-semibold leading-none tracking-tight" },
})
export class DialogTitleDirective {}

@Directive({
	selector: "[appDialogFooter]",
	host: {
		class: "flex items-center justify-end gap-2 border-t border-border p-6",
	},
})
export class DialogFooterDirective {}

/** Every dialog part, for `imports: [...DIALOG_DIRECTIVES]`. */
export const DIALOG_DIRECTIVES = [
	DialogComponent,
	DialogContentDirective,
	DialogHeaderDirective,
	DialogTitleDirective,
	DialogFooterDirective,
] as const;
