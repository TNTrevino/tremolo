import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { LabelDirective } from "../ui/label.directive";

/**
 * Port of frontend-react/src/shared/components/forms/FormLabel.tsx: the
 * `Label` primitive plus block spacing and the required asterisk.
 *
 * It stays a component rather than a directive because of that asterisk --
 * a directive cannot append an element. The host is `display: contents`,
 * so what lands in the DOM is still just a `<label for="...">` and
 * `getByLabel()` finds the control it points at.
 */
@Component({
	selector: "app-form-label",
	imports: [LabelDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<label appLabel class="block mb-1.5" [attr.for]="htmlFor()">
			<ng-content />
			@if (required()) {
				<span class="text-destructive ml-1">*</span>
			}
		</label>
	`,
})
export class FormLabelComponent {
	/** Matches React's `htmlFor`; rendered as the `for` attribute. */
	readonly htmlFor = input<string | null>(null);
	readonly required = input(false);
}
