import {
	ChangeDetectionStrategy,
	Component,
	effect,
	input,
	model,
	output,
	signal,
	untracked,
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { DIALOG_DIRECTIVES } from "../../../../shared/components/ui/dialog.component";
import type { KeyboardBindingsDraft } from "../../models/keymap";
import { KeyboardBindingsEditorComponent } from "../keyboard-bindings-editor/keyboard-bindings-editor.component";

/**
 * The keyboard-bindings dialog, and the sign-up prompt an anonymous player
 * gets instead. Port of `KeyboardBindingsDialog.tsx` plus the
 * `KeyboardUpsellDialog` that lived inside `SettingsBar.tsx`.
 *
 * Both are here because they are one control with two states, and the caller
 * chooses between them with a single flag rather than by rendering one of two
 * components.
 *
 * The editor works on a **draft**: Cancel discards it, Save emits it. React
 * held the draft in `useState` seeded from the prop; here an `effect` reseeds
 * it whenever the dialog opens, so re-opening never shows a stale edit.
 *
 * The draft now has two parts -- the 21-note map and the `overlap_accidentals`
 * toggle -- both reseeded together and both discarded together, since the
 * editor's own `overlapAccidentals` is a `model()` exactly like `bindings`.
 * `saveBindings` carries both out in one `KeyboardBindingsDraft`, because
 * `UserService.saveKeyboardBindings` saves them in one call and a player who
 * flips the toggle then hits Cancel must lose that flip too.
 */
@Component({
	selector: "app-keyboard-bindings-dialog",
	imports: [
		ButtonComponent,
		KeyboardBindingsEditorComponent,
		RouterLink,
		...DIALOG_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<app-dialog [(open)]="open">
			@if (canEdit()) {
				<div appDialogContent>
					<div appDialogHeader>
						<h2 appDialogTitle class="flex items-center gap-3">
							Keyboard Bindings
							@if (listening() !== null) {
								<span class="text-sm font-normal text-muted-foreground/50">
									listening...
								</span>
							}
						</h2>
					</div>
					<div class="p-6">
						<app-keyboard-bindings-editor
							[(bindings)]="draft"
							[(overlapAccidentals)]="draftOverlapAccidentals"
							(listeningChange)="listening.set($event)"
						/>
					</div>
					<div appDialogFooter>
						<app-button variant="ghost" (click)="open.set(false)">
							Cancel
						</app-button>
						<app-button variant="default" (click)="save()">Save</app-button>
					</div>
				</div>
			} @else {
				<div appDialogContent>
					<div appDialogHeader>
						<h2 appDialogTitle>Customize Keyboard Input</h2>
					</div>
					<div class="px-6 py-4 space-y-3">
						<p class="text-base text-muted-foreground">
							Create an account to configure your own keyboard bindings for all
							21 notes and have them saved across sessions.
						</p>
					</div>
					<div appDialogFooter>
						<app-button variant="ghost" (click)="open.set(false)">
							Cancel
						</app-button>
						<a routerLink="/signup">
							<app-button variant="default">Create Account</app-button>
						</a>
					</div>
				</div>
			}
		</app-dialog>
	`,
})
export class KeyboardBindingsDialogComponent {
	readonly open = model(false);

	/** Anonymous players get the sign-up prompt instead of the editor. */
	readonly canEdit = input(false);

	/** The saved (or default) note-to-key map the draft starts from. */
	readonly bindings = input.required<Record<string, string>>();

	/** The saved (or default) piano-layout flag the draft starts from. */
	readonly overlapAccidentals = input(false);

	readonly saveBindings = output<KeyboardBindingsDraft>();

	protected readonly draft = signal<Record<string, string>>({});
	protected readonly draftOverlapAccidentals = signal(false);
	protected readonly listening = signal<string | null>(null);

	constructor() {
		effect(() => {
			const bindings = this.bindings();
			const overlapAccidentals = this.overlapAccidentals();
			if (!this.open()) return;
			untracked(() => {
				this.draft.set({ ...bindings });
				this.draftOverlapAccidentals.set(overlapAccidentals);
			});
		});
	}

	protected save(): void {
		this.saveBindings.emit({
			bindings: this.draft(),
			overlapAccidentals: this.draftOverlapAccidentals(),
		});
		this.open.set(false);
	}
}
