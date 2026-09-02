import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { NgIcon } from "@ng-icons/core";

import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";

/**
 * Port of frontend-react/src/features/dashboard/components/DashboardStats.tsx:
 * the four-up stat grid under the performance chart.
 *
 * DESIGN.md rule 4 -- brass is the accuracy/NPM highlight; accuracy and total
 * sessions carry it here, average NPM and total time stay ink. That split is
 * React's and is what the baselines were captured from.
 */
@Component({
	selector: "app-dashboard-stats",
	imports: [NgIcon, ...CARD_DIRECTIVES],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: "block" },
	templateUrl: "./dashboard-stats.component.html",
})
export class DashboardStatsComponent {
	readonly avgNPM = input.required<number>();
	readonly avgAccuracy = input.required<number>();
	readonly timeReading = input.required<string>();
	readonly totalSessions = input.required<number>();
}
