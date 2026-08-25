import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgIcon } from "@ng-icons/core";

import { ButtonComponent } from "../../shared/components/ui/button.component";
import { CARD_DIRECTIVES } from "../../shared/components/ui/card.directive";

/** One card in the "What's included" grid. */
interface IncludedItem {
	readonly icon: string;
	readonly title: string;
	readonly description: string;
}

/** One numbered row under "What being a pilot teacher means". */
interface PilotStep {
	readonly step: number;
	readonly title: string;
	readonly description: string;
}

/**
 * The pricing page (#264): free for every teacher in the 2026-27 pilot,
 * reachable signed out at /pricing.
 *
 * Same shape as `HomePageComponent` -- no state, no request, just the
 * section rhythm the home page already established (hero on staff lines,
 * then py-20 card/grid sections at the home page's container max-widths).
 *
 * DESIGN.md: brass is the scarce accent -- "if brass appears more than
 * ~twice on a screen, remove one." It appears exactly twice here, both
 * times on the "Ask for an invite code" CTA (hero and closing section).
 * The four "What's included" tiles below deliberately stay
 * `bg-primary`/`text-primary`, not brass, to hold that count.
 */
@Component({
	selector: "app-pricing-page",
	imports: [RouterLink, NgIcon, ButtonComponent, ...CARD_DIRECTIVES],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./pricing-page.component.html",
})
export class PricingPageComponent {
	/** The five engraved staff lines behind the hero headline, as on /home. */
	protected readonly staffLines = [0, 1, 2, 3, 4] as const;

	/** TODO(owner): confirm contact@tremolonotes.com is a mailbox somebody reads before the first teacher demo. Same placeholder as the privacy and terms pages -- change all three together. */
	protected readonly inviteHref =
		"mailto:contact@tremolonotes.com?subject=Tremolo%20pilot%20invite%20code";

	protected readonly included: readonly IncludedItem[] = [
		{
			icon: "lucideMusic2",
			title: "All five games",
			description:
				"Note reading, key signatures, intervals, scales and chords. Every game is playable signed out, so a student can start before they have an account.",
		},
		{
			icon: "lucideCheck",
			title: "The sheet-music generator",
			description:
				"Fresh exercises from a scale, an octave and a rhythm pattern. A new line every time, so there is nothing to memorize.",
		},
		{
			icon: "lucideSchool",
			title: "Classes and assignments",
			description:
				"Create a class, read the join code to your students, and assign a game with the settings you choose. That configuration is frozen at assignment time.",
		},
		{
			icon: "lucideTrendingUp",
			title: "Progress you can see",
			description:
				"A results grid for every assignment, plus accuracy and notes-per-minute charts for each student.",
		},
	];

	protected readonly pilotSteps: readonly PilotStep[] = [
		{
			step: 1,
			title: "Use it with a real class",
			description:
				"Assign something you would have assigned anyway, to students you actually teach. A demo account tells us nothing.",
		},
		{
			step: 2,
			title: "Tell us what breaks",
			description:
				"A wrong answer, a confusing screen, a game that will not load on a school Chromebook. We would rather hear it from you than not hear it.",
		},
		{
			step: 3,
			title: "Tell us what is missing",
			description:
				"The features that decide whether you would keep using this get built first. Rhythm reading, more report views, printable worksheets — your list sets the order.",
		},
	];
}
