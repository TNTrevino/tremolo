import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgIcon } from "@ng-icons/core";

import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";
import { ClipboardService } from "../../../../shared/services/clipboard.service";
import type { Class } from "../../models/classes.models";

/**
 * Port of frontend-react/src/features/classes/components/ClassCard.tsx: one
 * class in the teacher's grid, showing the join code the teacher actually
 * hands to students.
 *
 * `ClipboardService` is provided **here**, not at the root: `copied` is
 * per-card state, and a shared instance would light up every card's tick at
 * once (the service's own header says so).
 *
 * The copy button sits inside the card's link, so its click has to stop
 * both the default navigation and the bubble -- the same two lines React's
 * `handleCopy` ran.
 */
@Component({
	selector: "app-class-card",
	imports: [ButtonComponent, NgIcon, RouterLink, ...CARD_DIRECTIVES],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ClipboardService],
	templateUrl: "./class-card.component.html",
})
export class ClassCardComponent {
	readonly classItem = input.required<Class>();

	private readonly clipboard = inject(ClipboardService);
	readonly copied = this.clipboard.copied;

	copy(event: Event): void {
		event.preventDefault();
		event.stopPropagation();
		this.clipboard.copy(this.classItem().joinCode);
	}
}
