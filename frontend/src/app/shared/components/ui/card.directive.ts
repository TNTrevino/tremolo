import { Directive } from "@angular/core";

/**
 * Port of frontend-react/src/shared/components/ui/card.tsx.
 *
 * React's six card parts were `div`/`h3`/`p` wrappers whose only job was a
 * class string, so in Angular they are attribute directives rather than
 * components: the element stays exactly the element the React version
 * rendered, no wrapper is introduced, and a caller can still add classes
 * with a plain `class="..."` because the host element is real.
 *
 * ```html
 * <div appCard class="w-full max-w-2xl">
 *   <div appCardHeader><h3 appCardTitle>Title</h3></div>
 *   <div appCardContent>…</div>
 * </div>
 * ```
 *
 * DESIGN.md rule 2: a card is the one place a soft shadow is allowed.
 */
@Directive({
	selector: "[appCard]",
	host: {
		class:
			"rounded-lg border-2 border-border bg-card text-card-foreground shadow-sm transition-all",
	},
})
export class CardDirective {}

@Directive({
	selector: "[appCardHeader]",
	host: { class: "flex flex-col space-y-1.5 p-6" },
})
export class CardHeaderDirective {}

@Directive({
	selector: "[appCardTitle]",
	host: { class: "text-2xl font-bold leading-none tracking-tight" },
})
export class CardTitleDirective {}

@Directive({
	selector: "[appCardDescription]",
	host: { class: "text-sm text-muted-foreground" },
})
export class CardDescriptionDirective {}

@Directive({
	selector: "[appCardContent]",
	host: { class: "p-6 pt-0" },
})
export class CardContentDirective {}

@Directive({
	selector: "[appCardFooter]",
	host: { class: "flex items-center p-6 pt-0" },
})
export class CardFooterDirective {}

/** Every card part, for `imports: [...CARD_DIRECTIVES]`. */
export const CARD_DIRECTIVES = [
	CardDirective,
	CardHeaderDirective,
	CardTitleDirective,
	CardDescriptionDirective,
	CardContentDirective,
	CardFooterDirective,
] as const;
