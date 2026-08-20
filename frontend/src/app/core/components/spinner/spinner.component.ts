import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from "@angular/core";

import { cn } from "../../../shared/utils/cn";

/**
 * The loading branch of PLAN.md 5.2's template block:
 *
 * ```html
 * @if (classes.isLoading()) { <app-spinner /> }
 * ```
 *
 * Two shapes, both lifted from the React app rather than invented:
 * `fullPage` is `App.tsx`'s `PageLoader` (the Suspense fallback for a lazy
 * route), and the default is the same disc sized for an inline slot.
 *
 * `QueryState` is deliberately **not** ported -- its job is now that
 * template block, and this is the component the loading arm renders.
 */
@Component({
	selector: "app-spinner",
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div [class]="wrapperClasses()">
			<div
				class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
				role="status"
				[attr.aria-label]="label()"
			></div>
		</div>
	`,
})
export class SpinnerComponent {
	/** Renders the `min-h-screen` route-level fallback instead of an inline one. */
	readonly fullPage = input(false);
	readonly label = input("Loading");

	protected readonly wrapperClasses = computed(() =>
		cn(
			"flex items-center justify-center",
			this.fullPage() ? "min-h-screen" : "py-8",
		),
	);
}
