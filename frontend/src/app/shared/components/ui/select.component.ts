import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model,
	output,
} from "@angular/core";
import type { FormValueControl } from "@angular/forms/signals";
import { NgIcon } from "@ng-icons/core";

import { cn } from "../../utils/cn";

const SELECT_BASE =
	"flex h-10 w-full appearance-none rounded-md border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all";

/**
 * Port of frontend-react/src/shared/components/ui/select.tsx.
 *
 * This one has to be a component rather than a directive because React's
 * version is not just a `<select>`: it is a relatively-positioned wrapper
 * holding the select plus an absolutely-positioned chevron. The host
 * element takes the wrapper's classes, so the rendered DOM is the same
 * shape it was in React -- wrapper, select, chevron.
 *
 * It implements `FormValueControl<string>`, which is how Signal Forms
 * binds a custom control, so both of these work:
 *
 * ```html
 * <app-select [(value)]="clef">…</app-select>
 * <app-select [formField]="signupForm.role">…</app-select>
 * ```
 *
 * `<option>` elements are projected, so callers keep writing plain
 * options (and `@for` over them) exactly as they wrote JSX children.
 */
@Component({
	selector: "app-select",
	imports: [NgIcon],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: "block w-full relative" },
	template: `
		<select
			[class]="classes()"
			[id]="selectId()"
			[value]="value()"
			[disabled]="disabled()"
			[attr.aria-label]="ariaLabel()"
			[attr.aria-invalid]="error() ? true : null"
			(change)="onChange($event)"
			(blur)="touch.emit()"
		>
			<ng-content />
		</select>
		<ng-icon
			name="lucideChevronDown"
			aria-hidden="true"
			class="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none"
		/>
	`,
})
export class SelectComponent implements FormValueControl<string> {
	/** The `FormValueControl` contract: a two-way model, not an input. */
	readonly value = model("");

	/** Set by Signal Forms from the bound field; settable by hand too. */
	readonly disabled = input(false);

	/** Relayed to the field so blur marks it touched. */
	readonly touch = output<void>();

	readonly selectId = input<string | null>(null);
	readonly ariaLabel = input<string | null>(null);

	/**
	 * Extra classes for the `<select>` itself, merged through `cn()`.
	 *
	 * React put `className` on the element, not on the wrapper -- the note
	 * game's settings bar sizes its scale picker with `w-28 h-9` and the
	 * baselines were captured from that. A `class` on `<app-select>` reaches
	 * the wrapper instead, which is a different box.
	 */
	readonly className = input("");

	/**
	 * A `model()` rather than an `input()` so `appFormSelect` can push the
	 * bound field's message in; callers may still set it directly.
	 */
	readonly error = model<string | null>(null);

	protected readonly classes = computed(() =>
		cn(
			SELECT_BASE,
			this.error() ? "border-destructive focus-visible:ring-destructive" : "",
			this.className(),
		),
	);

	protected onChange(event: Event): void {
		this.value.set((event.target as HTMLSelectElement).value);
	}
}
