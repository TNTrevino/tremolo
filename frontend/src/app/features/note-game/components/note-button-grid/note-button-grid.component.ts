import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
} from "@angular/core";

import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { CardDirective } from "../../../../shared/components/ui/card.directive";
import { DEFAULT_NOTE_TO_KEY_MAP } from "../../models/keymap";
import { NOTES } from "../../models/note-game.models";

/**
 * The 21-button answer pad. Port of `NoteButtonGrid` in
 * frontend-react/src/features/note-game/components/GameBoard.tsx.
 *
 * Three rows of seven, in the order the keyboard rows are laid out: sharps,
 * naturals, flats. Each button prints the note and, under it, the key bound
 * to it -- so the physical keyboard is discoverable without a legend.
 *
 * **The two-line label is an acceptance criterion.** `games.spec.ts` finds
 * the natural C by the pattern `/^C(\s|$)/`, which matches the accessible
 * name "C a" and deliberately does not match "C#" or "Cb". Collapsing the
 * key hint into the same text node, or dropping it, breaks that.
 */
@Component({
	selector: "app-note-button-grid",
	imports: [ButtonComponent, CardDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<div appCard className="flex-shrink-0 p-2 sm:p-4">
			<div class="grid grid-cols-7 gap-1.5 sm:gap-2">
				@for (note of notes; track note) {
					<app-button
						variant="outline"
						[className]="buttonClasses()"
						(click)="answer.emit(note + '#')"
					>
						<span>{{ note }}#</span>
						@if (keyMap()[note + "#"]; as boundKey) {
							<span
								class="text-[10px] text-muted-foreground font-normal leading-none"
								>{{ boundKey }}</span
							>
						}
					</app-button>
				}
				@for (note of notes; track note) {
					<app-button
						variant="secondary"
						[className]="buttonClasses()"
						(click)="answer.emit(note)"
					>
						<span>{{ note }}</span>
						@if (keyMap()[note]; as boundKey) {
							<span
								class="text-[10px] text-muted-foreground font-normal leading-none"
								>{{ boundKey }}</span
							>
						}
					</app-button>
				}
				@for (note of notes; track note) {
					<app-button
						variant="outline"
						[className]="buttonClasses()"
						(click)="answer.emit(note + 'b')"
					>
						<span>{{ note }}b</span>
						@if (keyMap()[note + "b"]; as boundKey) {
							<span
								class="text-[10px] text-muted-foreground font-normal leading-none"
								>{{ boundKey }}</span
							>
						}
					</app-button>
				}
			</div>
		</div>
	`,
})
export class NoteButtonGridComponent {
	/** Tailwind height/text classes; the landscape board uses smaller keys. */
	readonly buttonHeight = input("h-11 sm:h-16 text-xs sm:text-lg");

	/** Note -> key, for the hint under each label. */
	readonly keyMap = input<Record<string, string>>(DEFAULT_NOTE_TO_KEY_MAP);

	readonly answer = output<string>();

	protected readonly notes = NOTES;

	protected buttonClasses(): string {
		return `${this.buttonHeight()} font-bold px-0 sm:px-2 flex flex-col items-center justify-center gap-0`;
	}
}
