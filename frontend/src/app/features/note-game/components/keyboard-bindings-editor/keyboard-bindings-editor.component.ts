import {
	ChangeDetectionStrategy,
	Component,
	model,
	output,
	signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { filter, fromEvent } from "rxjs";

import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { CardDirective } from "../../../../shared/components/ui/card.directive";
import { cn } from "../../../../shared/utils/cn";
import { NATURAL_NOTES } from "../../models/engine.models";
import { DEFAULT_NOTE_TO_KEY_MAP } from "../../models/keymap";

/**
 * Rebinds the 21 note keys. Port of
 * frontend-react/src/features/note-game/components/KeyboardBindingsEditor.tsx.
 *
 * Click a note, press a key, done. If that key already belonged to another
 * note the two swap, so the map never has a hole in it -- React's behaviour,
 * and the reason the editor holds a draft rather than saving per keystroke.
 *
 * **The listener runs in the capture phase, and that is load-bearing.** React
 * used `{ capture: true }` so Escape could cancel "listening" without also
 * reaching the dialog's own Escape handler and closing the dialog. A capture
 * listener on `document` runs before anything else sees the event, so
 * `stopPropagation()` there really does stop it -- an Angular
 * `(document:keydown)` host binding is bubble-phase and would fire *after*
 * `<app-dialog>`'s, which is why this one is a stream instead.
 *
 * (The game's own keydown stream is a separate matter: it is switched off
 * through `NoteGameService.inputDisabled` while the dialog is open, so
 * rebinding "C" cannot also answer "C".)
 *
 * The sharp and flat rows are declared here because they exist nowhere else
 * -- they are the seven letters with an accidental, which no other screen
 * needs. The naturals row is **imported**: it is the shared `NATURAL_NOTES`,
 * and this is one of the four constants `frontend/CLAUDE.md` says to import
 * rather than redeclare. React had its own copy; that is the one thing here
 * that is not a verbatim port.
 */

const SHARP_NOTES = ["C#", "D#", "E#", "F#", "G#", "A#", "B#"] as const;
const FLAT_NOTES = ["Cb", "Db", "Eb", "Fb", "Gb", "Ab", "Bb"] as const;

@Component({
	selector: "app-keyboard-bindings-editor",
	imports: [ButtonComponent, CardDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
	`,
	template: `
		<div appCard className="space-y-4 p-4">
			@for (row of rows; track row.label) {
				<div class="space-y-1">
					<span class="text-xs font-medium text-muted-foreground">{{
						row.label
					}}</span>
					<div class="grid grid-cols-7 gap-2">
						@for (note of row.notes; track note) {
							<app-button
								variant="outline"
								[className]="buttonClasses(note)"
								(click)="arm(note)"
							>
								<span class="text-sm font-bold">{{ note }}</span>
								@if (listening() === note) {
									<span class="text-xs text-primary/60">...</span>
								} @else {
									<span class="text-xs text-muted-foreground">{{
										bindings()[note] ?? "---"
									}}</span>
								}
							</app-button>
						}
					</div>
				</div>
			}
			<div class="flex justify-end pt-2">
				<app-button variant="ghost" size="sm" (click)="resetToDefaults()">
					Reset to Defaults
				</app-button>
			</div>
		</div>
	`,
})
export class KeyboardBindingsEditorComponent {
	readonly bindings = model.required<Record<string, string>>();

	/** The note awaiting a key, or null. The dialog title reads it. */
	readonly listeningChange = output<string | null>();

	protected readonly listening = signal<string | null>(null);

	protected readonly rows = [
		{ label: "Sharps", notes: SHARP_NOTES },
		{ label: "Naturals", notes: NATURAL_NOTES },
		{ label: "Flats", notes: FLAT_NOTES },
	] as const;

	constructor() {
		fromEvent<KeyboardEvent>(document, "keydown", { capture: true })
			.pipe(
				filter(() => this.listening() !== null),
				takeUntilDestroyed(),
			)
			.subscribe((event) => this.capture(event));
	}

	protected buttonClasses(note: string): string {
		return cn(
			"h-16 flex-col gap-0.5 px-1",
			this.listening() === note &&
				"border-primary/40 bg-primary/5 shadow-[0_0_6px_0] shadow-primary/20",
		);
	}

	protected arm(note: string): void {
		this.setListening(note);
	}

	protected resetToDefaults(): void {
		this.bindings.set({ ...DEFAULT_NOTE_TO_KEY_MAP });
	}

	private capture(event: KeyboardEvent): void {
		const note = this.listening();
		if (note === null) return;

		event.preventDefault();
		// Nothing else may act on the key that is being bound -- least of all
		// the dialog's Escape-to-close.
		event.stopPropagation();

		if (event.key === "Escape") {
			this.setListening(null);
			return;
		}

		const current = this.bindings();
		const previousKey = current[note];
		const conflicting = Object.entries(current).find(
			([other, key]) => key === event.key && other !== note,
		);

		const updated = { ...current, [note]: event.key };
		// The displaced note inherits the key this one was using, so a swap
		// never leaves a note unbound.
		if (conflicting && previousKey) updated[conflicting[0]] = previousKey;

		this.bindings.set(updated);
		this.setListening(null);
	}

	private setListening(note: string | null): void {
		this.listening.set(note);
		this.listeningChange.emit(note);
	}
}
