import { computed, Directive, input } from "@angular/core";

import { cn } from "../../utils/cn";

/**
 * Port of frontend-react/src/shared/components/ui/card.tsx.
 *
 * React's six card parts were `div`/`h3`/`p` wrappers whose only job was a
 * class string, so in Angular they are attribute directives rather than
 * components: the element stays exactly the element the React version
 * rendered, and no wrapper is introduced.
 *
 * ```html
 * <div appCard className="w-full max-w-md shadow-lg">
 *   <div appCardHeader className="space-y-1 text-center">
 *     <h1 appCardTitle className="text-3xl">Title</h1>
 *   </div>
 *   <div appCardContent className="flex flex-col gap-4">…</div>
 * </div>
 * ```
 *
 * **Pass overrides through `className`, not `class`.** Each React part ran
 * its base classes and the caller's through `cn()` (tailwind-merge), so
 * `shadow-lg` replaced `shadow-sm` and `text-3xl` replaced both `text-2xl`
 * and `leading-none`. A plain `class` attribute cannot do that -- Angular
 * concatenates it with the host class and the winner is whichever utility
 * Tailwind happens to emit last, which is alphabetical within a plugin and
 * therefore arbitrary (`text-sm` beats `text-base`; `leading-none` beats
 * `leading-9`). `className` restores React's merge. A `class` attribute
 * still works for utilities that cannot conflict with the base list.
 *
 * DESIGN.md rule 2: a card is the one place a soft shadow is allowed.
 */
@Directive({
	selector: "[appCard]",
	host: { "[class]": "classes()" },
})
export class CardDirective {
	readonly className = input("");
	protected readonly classes = computed(() =>
		cn(
			"rounded-lg border-2 border-border bg-card text-card-foreground shadow-sm transition-all",
			this.className(),
		),
	);
}

@Directive({
	selector: "[appCardHeader]",
	host: { "[class]": "classes()" },
})
export class CardHeaderDirective {
	readonly className = input("");
	protected readonly classes = computed(() =>
		cn("flex flex-col space-y-1.5 p-6", this.className()),
	);
}

@Directive({
	selector: "[appCardTitle]",
	host: { "[class]": "classes()" },
})
export class CardTitleDirective {
	readonly className = input("");
	protected readonly classes = computed(() =>
		cn("text-2xl font-bold leading-none tracking-tight", this.className()),
	);
}

@Directive({
	selector: "[appCardDescription]",
	host: { "[class]": "classes()" },
})
export class CardDescriptionDirective {
	readonly className = input("");
	protected readonly classes = computed(() =>
		cn("text-sm text-muted-foreground", this.className()),
	);
}

@Directive({
	selector: "[appCardContent]",
	host: { "[class]": "classes()" },
})
export class CardContentDirective {
	readonly className = input("");
	protected readonly classes = computed(() => cn("p-6 pt-0", this.className()));
}

@Directive({
	selector: "[appCardFooter]",
	host: { "[class]": "classes()" },
})
export class CardFooterDirective {
	readonly className = input("");
	protected readonly classes = computed(() =>
		cn("flex items-center p-6 pt-0", this.className()),
	);
}

/** Every card part, for `imports: [...CARD_DIRECTIVES]`. */
export const CARD_DIRECTIVES = [
	CardDirective,
	CardHeaderDirective,
	CardTitleDirective,
	CardDescriptionDirective,
	CardContentDirective,
	CardFooterDirective,
] as const;
