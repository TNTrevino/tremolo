import { ChangeDetectionStrategy, Component } from "@angular/core";
import { NgIcon } from "@ng-icons/core";

import { CARD_DIRECTIVES } from "../../shared/components/ui/card.directive";

/**
 * One icon-and-prose row under "For Music Educators" / "For Developing
 * Musicians".
 *
 * `tileClass` and `iconClass` hold **complete** class strings rather than a
 * tone name a template turns into a class. Tailwind scans `src/**\/*.{ts,html}`
 * for literals, so a string written out here is emitted; one assembled at
 * runtime (`` `bg-${tone}/10` ``) never is. Same trap sub-feature 1 hit with
 * the password-strength colours.
 */
interface Highlight {
	readonly icon: string;
	readonly tileClass: string;
	readonly iconClass: string;
	readonly title: string;
	readonly description: string;
}

const PRIMARY_TILE =
	"flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center";
const BRASS_TILE =
	"flex-shrink-0 w-12 h-12 rounded-lg bg-brass/10 flex items-center justify-center";

/**
 * Port of frontend-react/src/pages/AboutPage.tsx.
 *
 * Static copy, no state and no request. React wrote all five highlight rows
 * out longhand; they are identical in structure, so they live here as data
 * and the template loops. The rendered DOM is the same either way, which is
 * what the screenshot baselines care about.
 *
 * The headings here are deliberately **not** `font-display`: React's About
 * page never applied it (only HomePage did), and the baselines were captured
 * from that. See phase-3-subfeature-2-handoff.md.
 */
@Component({
	selector: "app-about-page",
	imports: [NgIcon, ...CARD_DIRECTIVES],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./about-page.component.html",
})
export class AboutPageComponent {
	protected readonly educatorHighlights: readonly Highlight[] = [
		{
			icon: "lucideBook",
			tileClass: PRIMARY_TILE,
			iconClass: "text-primary",
			title: "Real Reading, Not Memorization",
			description:
				"The biggest challenge in music education is students memorizing pieces instead of learning to sight-read. Our dynamic exercises prevent memorization by generating unique patterns every time, forcing students to engage with actual note reading.",
		},
		{
			icon: "lucideTrophy",
			tileClass: BRASS_TILE,
			iconClass: "text-brass",
			title: "UIL-Focused Practice",
			description:
				"Tremolo targets specific rhythms and patterns that frequently appear in UIL sight reading competitions. Students can practice the exact skills they'll need to succeed in competitive settings.",
		},
		{
			icon: "lucideBrain",
			tileClass: PRIMARY_TILE,
			iconClass: "text-primary",
			title: "Customizable Learning Paths",
			description:
				"Every student learns differently. Create tailored exercises that target specific weaknesses, reinforce strengths, and adapt to individual learning speeds and styles.",
		},
	];

	protected readonly musicianHighlights: readonly Highlight[] = [
		{
			icon: "lucideMusic2",
			tileClass: PRIMARY_TILE,
			iconClass: "text-primary",
			title: "Advanced Skill Development",
			description:
				"Work on complex chord structures, challenging scale degree jumps, and intricate intervallic patterns. Build the sight-reading skills that separate good musicians from great ones.",
		},
		{
			icon: "lucideTrendingUp",
			tileClass: BRASS_TILE,
			iconClass: "text-brass",
			title: "Practice What You Need",
			description:
				"Preparing for an audition? Working on a challenging piece? Customize your practice to target exactly what you need. Track your progress with detailed analytics and see measurable improvement over time.",
		},
	];
}
