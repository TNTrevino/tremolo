import type { Signal } from "@angular/core";

/**
 * The shape the form kit needs from a Signal Forms field: something
 * callable that hands back a touched flag and a list of errors.
 *
 * Structural on purpose. A `FieldTree<T>` from `@angular/forms/signals`
 * satisfies it for every `T`, so `app-form-field` and the two `appForm*`
 * directives can accept any field without being generic and without
 * fighting the variance of `FieldState<T>`.
 */
export type FieldErrorSource = () => {
	readonly touched: Signal<boolean>;
	readonly errors: Signal<readonly { readonly message?: string }[]>;
};

/**
 * The message a field should be showing, or `null`.
 *
 * Errors stay hidden until the field is touched, which is the behaviour
 * React Hook Form's default `mode: "onSubmit"` gave: nothing shouts at a
 * half-typed field, and `submit()` (or `form().markAsTouched()`) marks
 * every field touched, so pressing the button reveals everything at once.
 */
export function fieldErrorMessage(
	field: FieldErrorSource | null | undefined,
): string | null {
	if (!field) return null;
	const state = field();
	if (!state.touched()) return null;
	return state.errors().find((error) => error.message)?.message ?? null;
}
