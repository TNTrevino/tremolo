import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * Port of frontend-react/src/shared/components/forms/FormError.tsx.
 *
 * Renders nothing when there is no message, exactly as the React version
 * returned `null` for empty children -- so an error line never occupies
 * space until there is something to say.
 */
@Component({
	selector: "app-form-error",
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		@if (message()) {
			<p class="mt-1 text-sm text-destructive font-medium">{{ message() }}</p>
		}
	`,
})
export class FormErrorComponent {
	readonly message = input<string | null | undefined>(null);
}
