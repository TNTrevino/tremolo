import type { Signal } from "@angular/core";

/**
 * The shape the form kit needs from a Signal Forms field: something
 * callable that hands back the state flags and the list of errors.
 *
 * Structural on purpose. A `FieldTree<T>` from `@angular/forms/signals`
 * satisfies it for every `T`, so `app-form-field` and the two `appForm*`
 * directives can accept any field without being generic and without
 * fighting the variance of `FieldState<T>`.
 */
export type FieldErrorSource = () => {
	readonly touched: Signal<boolean>;
	readonly dirty: Signal<boolean>;
	readonly errors: Signal<readonly { readonly message?: string }[]>;
};

/**
 * The shape `revealErrors` needs: a callable field whose state can be
 * marked. Structural for the same reason `FieldErrorSource` is -- a
 * `FieldTree<T>` satisfies it for every `T`.
 */
export type FieldRevealTarget = () => {
	markAsTouched(): void;
	markAsDirty(): void;
};

/**
 * The message a field should be showing, or `null`.
 *
 * **A field stays quiet until the user has typed in it and moved on**
 * (`touched() && dirty()`), or until they press the submit button, which
 * calls {@link revealErrors}.
 *
 * Signal Forms marks a field touched on **blur**, so gating on `touched()`
 * alone made every form in the app scold a visitor who had typed nothing
 * and merely tabbed through it -- four red lines under four empty boxes on
 * `/signup` (#303). `dirty()` is the missing half: Signal Forms sets it
 * only when the bound control writes a value, and `reset()` clears it
 * again, so it means exactly "this person put something here".
 *
 * That leaves the empty-and-required case to the submit button, which is
 * where it belongs -- nothing shouts at a half-typed field, and one press
 * of Create Account reveals everything that is still missing at once.
 */
export function fieldErrorMessage(
	field: FieldErrorSource | null | undefined,
): string | null {
	if (!field) return null;
	const state = field();
	if (!state.touched() || !state.dirty()) return null;
	return state.errors().find((error) => error.message)?.message ?? null;
}

/**
 * Reveal every message a form is holding back -- what a submit handler
 * calls before it reads `invalid()`.
 *
 * `markAsTouched()` on the root already cascades to every descendant, but
 * `markAsDirty()` does not (Angular sets that flag per node, from the
 * bound control), so this walks the field tree. `Object.values` on a
 * `FieldTree` hands back its child fields -- the same proxy traps Signal
 * Forms' own `Symbol.iterator` over a field goes through -- and a leaf
 * holding a string or a number reports none, so the walk terminates
 * there.
 *
 * Pressing submit is the user asserting the form's contents, empty boxes
 * included, which is why marking them dirty is the honest flag rather than
 * a trick: it says the same thing typing does -- these are their values,
 * judge them.
 */
export function revealErrors(form: FieldRevealTarget): void {
	form().markAsTouched();
	markSubtreeDirty(form);
}

function markSubtreeDirty(field: FieldRevealTarget): void {
	field().markAsDirty();
	// The cast is the price of the structural parameter type above: a
	// `FieldTree` is both callable and indexable, and no one type spells
	// both without dragging `FieldState<T>`'s variance back in.
	const children = field as unknown as Record<string, FieldRevealTarget>;
	for (const child of Object.values(children)) {
		markSubtreeDirty(child);
	}
}
