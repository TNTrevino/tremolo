import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgIcon } from "@ng-icons/core";

import { ButtonComponent } from "../../shared/components/ui/button.component";
import { CARD_DIRECTIVES } from "../../shared/components/ui/card.directive";

/** One row of the "How It Works" list. */
interface HowItWorksStep {
	readonly step: number;
	readonly title: string;
	readonly description: string;
}

/**
 * Port of frontend-react/src/pages/HomePage.tsx.
 *
 * The page holds no state and makes no request -- it is the marketing
 * landing page, reachable at `/home` (the root path redirects to
 * `/note-game`, see app.routes.ts). Everything here is copy and layout, so
 * the component's only job is to carry the two lists the React version
 * mapped over inline.
 *
 * DESIGN.md rule 5 ("hero = notation, not gradient") is the shape of the
 * first section: paper background, faint engraved staff lines behind a
 * one-color ink headline, and a single brass CTA. The staff lines are
 * decorative -- `aria-hidden` in the template -- and the loop below is only
 * there so the template does not repeat the same `<div>` five times.
 */
@Component({
	selector: "app-home-page",
	imports: [RouterLink, NgIcon, ButtonComponent, ...CARD_DIRECTIVES],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./home-page.component.html",
})
export class HomePageComponent {
	/** The five engraved staff lines behind the hero headline. */
	protected readonly staffLines = [0, 1, 2, 3, 4] as const;

	protected readonly steps: readonly HowItWorksStep[] = [
		{
			step: 1,
			title: "Choose Your Exercise",
			description:
				"Select from note games, rhythm practice, or custom exercises tailored to your needs.",
		},
		{
			step: 2,
			title: "Practice & Learn",
			description:
				"Work through exercises tailored to your skill level and goals with immediate feedback.",
		},
		{
			step: 3,
			title: "Track Improvement",
			description:
				"View your progress and celebrate your musical growth with detailed analytics.",
		},
	];
}
