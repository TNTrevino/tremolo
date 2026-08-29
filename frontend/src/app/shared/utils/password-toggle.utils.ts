import { computed, type Signal } from "@angular/core";

/**
 * The label a password reveal toggle carries -- aria-label and tooltip say
 * the same words (DESIGN.md rule 7), and login, signup and reset-password
 * all need the same pair per field. One factory so the wording cannot
 * drift copy by copy.
 *
 * The account page's all-fields toggle ("Show all password fields") flips
 * every field at once; it is a different control and keeps its own label.
 */
export function showHideLabel(
	shown: Signal<boolean>,
	subject: string,
): Signal<string> {
	return computed(() => (shown() ? `Hide ${subject}` : `Show ${subject}`));
}
