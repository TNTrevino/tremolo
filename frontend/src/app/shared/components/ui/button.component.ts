import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from "@angular/core";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../utils/cn";

/**
 * Port of frontend-react/src/shared/components/ui/button.tsx.
 *
 * The CVA variant API is unchanged -- same variant names, same size names,
 * same class strings -- because those class strings are what the screenshot
 * baselines were captured from. `buttonVariants` is exported for the same
 * reason it was in React: other components (nav links styled as buttons)
 * borrow the classes without borrowing the element.
 *
 * DESIGN.md: buttons carry no shadow, borders do the work; `brass` is the
 * scarce accent (one primary CTA per screen) and `outline` is the quiet
 * answer-button style.
 */
export const buttonVariants = cva(
	"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
				brass: "bg-brass text-brass-foreground hover:bg-brass/90",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive/90",
				outline:
					"border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary/80",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-9 rounded-md px-3",
				lg: "h-11 rounded-md px-8 text-base font-bold",
				xl: "h-14 rounded-md px-10 text-lg font-bold",
				icon: "h-10 w-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export type ButtonVariant = NonNullable<
	VariantProps<typeof buttonVariants>["variant"]
>;
export type ButtonSize = NonNullable<
	VariantProps<typeof buttonVariants>["size"]
>;

/**
 * `<app-button>` renders a real `<button>` and the host is `display:
 * contents`, so the button itself -- not a wrapper element -- is the flex
 * item its parent lays out. That is what keeps the ported markup
 * pixel-identical to React's, where `<Button>` *was* the button.
 *
 * Because the host box disappears, a `class` written on `<app-button>`
 * would style nothing. Extra classes go through the `className` input,
 * which keeps the React call sites mechanical to port.
 */
@Component({
	selector: "app-button",
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<button
			[type]="type()"
			[class]="classes()"
			[disabled]="disabled() || loading()"
			[attr.aria-label]="ariaLabel()"
			[attr.aria-expanded]="ariaExpanded()"
			[attr.aria-haspopup]="ariaHasPopup()"
		>
			@if (loading()) {
				<svg
					class="mr-2 h-4 w-4 animate-spin"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
					/>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					/>
				</svg>
				Loading...
			} @else {
				<ng-content />
			}
		</button>
	`,
})
export class ButtonComponent {
	readonly variant = input<ButtonVariant>("default");
	readonly size = input<ButtonSize>("default");
	readonly className = input("");
	readonly loading = input(false);
	readonly disabled = input(false);

	/**
	 * Defaults to `button`, where a bare React `<Button>` inside a form
	 * defaulted to `submit`. Explicit beats implicit for the one behaviour
	 * that silently posts a form.
	 */
	readonly type = input<"button" | "submit" | "reset">("button");

	readonly ariaLabel = input<string | null>(null);
	readonly ariaExpanded = input<boolean | null>(null);
	readonly ariaHasPopup = input<string | null>(null);

	readonly classes = computed(() =>
		cn(
			buttonVariants({
				variant: this.variant(),
				size: this.size(),
				class: this.className(),
			}),
		),
	);
}
