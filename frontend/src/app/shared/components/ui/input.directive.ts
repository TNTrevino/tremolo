import { computed, Directive, input } from "@angular/core";

import { cn } from "../../utils/cn";

export const INPUT_BASE =
	"flex h-10 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all";

/** The one place the "this field is wrong" border is decided. */
export function inputClasses(error: string | null | undefined): string {
	return cn(
		INPUT_BASE,
		error ? "border-destructive focus-visible:ring-destructive" : "",
	);
}

/**
 * Port of frontend-react/src/shared/components/ui/input.tsx.
 *
 * A directive, not a component: the host stays a native `<input>`, which
 * means Signal Forms' `[formField]` binds to it directly (its case 1 --
 * "a native HTML input or textarea") and no wrapper element appears in the
 * DOM the screenshot baselines were captured from.
 *
 * `error` is a message string, not a boolean, exactly as in React -- an
 * empty/absent value leaves the normal border, any message turns it
 * destructive. When the input is bound to a form field, prefer
 * `appFormInput`, which reads the message off the field instead.
 */
@Directive({
	selector: "input[appInput], textarea[appInput]",
	host: {
		"[class]": "classes()",
		"[attr.aria-invalid]": "error() ? true : null",
	},
})
export class InputDirective {
	readonly error = input<string | null | undefined>(null);

	protected readonly classes = computed(() => inputClasses(this.error()));
}
