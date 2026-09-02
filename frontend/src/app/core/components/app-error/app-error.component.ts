import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from "@angular/core";

import { getErrorMessage } from "../../../shared/utils/error.utils";

/**
 * The error branch of PLAN.md 5.2's template block:
 *
 * ```html
 * @else if (classes.error()) { <app-error [error]="classes.error()" /> }
 * ```
 *
 * This is the half of `QueryState` that was standardized in React: loading
 * and empty states stayed caller-owned, but every list showed the same
 * friendly `getErrorMessage(error)` line instead of a raw `error.message`.
 * The markup and the `errorFallback` escape hatch are carried over
 * unchanged.
 */
@Component({
	selector: "app-error",
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="flex items-center justify-center h-24">
			<p class="text-sm text-destructive">{{ message() }}</p>
		</div>
	`,
})
export class AppErrorComponent {
	readonly error = input<unknown>(null);

	/** Shown when there is no error object to read a message from. */
	readonly fallback = input("Something went wrong. Please try again.");

	protected readonly message = computed(() => {
		const error = this.error();
		return error ? getErrorMessage(error) : this.fallback();
	});
}
