import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from "@angular/core";

import { cn } from "@shared/utils/cn";

/**
 * A toggle chip with a constant box.
 *
 * Port of the `Chip` helper inside
 * frontend-react/src/features/identification-game/settings/SettingsControls.tsx.
 * The border is present in both states and only its colour changes, so
 * selecting a chip never resizes it and reflows the row. Height grows with
 * content -- the glyph chips (clefs, key signatures) are taller than the
 * text ones.
 *
 * A component rather than markup repeated twice, because the multi-choice
 * row and the on/off toggle both need it.
 */
@Component({
	selector: "app-setting-chip",
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<button
			type="button"
			[class]="classes()"
			[attr.aria-label]="ariaLabel()"
			[attr.aria-pressed]="ariaPressed()"
			(click)="pressed.emit()"
		>
			<ng-content />
		</button>
	`,
})
export class SettingChipComponent {
	readonly selected = input(false);
	readonly ariaLabel = input<string | null>(null);
	readonly ariaPressed = input<boolean | null>(null);

	readonly pressed = output<void>();

	protected readonly classes = computed(() =>
		cn(
			"inline-flex min-h-7 items-center justify-center rounded-md border-2 px-2 py-0.5 text-xs font-medium transition-colors",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
			this.selected()
				? "border-primary bg-primary text-primary-foreground"
				: "border-input bg-background hover:bg-accent hover:text-accent-foreground",
		),
	);
}
