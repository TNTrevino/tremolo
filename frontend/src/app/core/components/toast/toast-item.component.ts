import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	input,
	OnInit,
	output,
	signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { NgIcon } from "@ng-icons/core";
import { timer } from "rxjs";

import { TooltipDirective } from "../../../shared/components/ui/tooltip.directive";
import type { Toast } from "../../services/notification.service";

/** Matches React's 300ms exit transition. */
const EXIT_MS = 300;

const ICONS: Record<Toast["type"], { name: string; class: string }> = {
	success: { name: "lucideCheckCircle2", class: "h-5 w-5 text-green-500" },
	error: { name: "lucideAlertCircle", class: "h-5 w-5 text-red-500" },
	warning: { name: "lucideAlertTriangle", class: "h-5 w-5 text-yellow-500" },
	info: { name: "lucideInfo", class: "h-5 w-5 text-blue-500" },
};

const VARIANTS: Record<Toast["type"], string> = {
	success:
		"bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
	error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
	warning:
		"bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
	info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
};

/**
 * One toast. Port of the `ToastItem` half of
 * frontend-react/src/shared/components/ui/toast.tsx.
 *
 * Auto-dismissal lives here, not in `NotificationService` -- that is the
 * split Phase 1 fixed in the service's contract: `duration` rides on the
 * toast and the component times it out, then asks to be removed.
 *
 * Both timers are `timer()` piped through `takeUntilDestroyed` (PLAN.md
 * 5.6), which is what React's `clearTimeout` cleanup becomes: no stored
 * handles, no `ngOnDestroy`.
 */
@Component({
	selector: "app-toast-item",
	imports: [NgIcon, TooltipDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div [class]="classes()" role="alert">
			<div class="flex-shrink-0">
				<ng-icon
					[name]="icon().name"
					[class]="icon().class"
					aria-hidden="true"
				/>
			</div>
			<div class="flex-1 space-y-1">
				@if (toast().title; as title) {
					<p class="text-sm font-semibold text-foreground">{{ title }}</p>
				}
				<p class="text-sm text-muted-foreground">{{ toast().message }}</p>
			</div>
			<button
				type="button"
				class="flex-shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
				aria-label="Dismiss notification"
				appTooltip="Dismiss notification"
				(click)="dismiss()"
			>
				<ng-icon name="lucideX" class="h-4 w-4" aria-hidden="true" />
			</button>
		</div>
	`,
})
export class ToastItemComponent implements OnInit {
	readonly toast = input.required<Toast>();
	readonly closed = output<string>();

	private readonly destroyRef = inject(DestroyRef);
	private readonly exiting = signal(false);

	protected readonly icon = computed(() => ICONS[this.toast().type]);

	protected readonly classes = computed(
		() =>
			"pointer-events-auto flex w-full max-w-md gap-3 rounded-lg border-2 p-4 shadow-lg transition-all duration-300 " +
			VARIANTS[this.toast().type] +
			" " +
			(this.exiting()
				? "translate-x-full opacity-0"
				: "translate-x-0 opacity-100 animate-in slide-in-from-right"),
	);

	ngOnInit(): void {
		const { duration, id } = this.toast();
		if (duration <= 0) return;

		timer(Math.max(duration - EXIT_MS, 0))
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.exiting.set(true));

		timer(duration)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.closed.emit(id));
	}

	protected dismiss(): void {
		this.exiting.set(true);
		timer(EXIT_MS)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.closed.emit(this.toast().id));
	}
}
