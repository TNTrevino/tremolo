import { ChangeDetectionStrategy, Component } from "@angular/core";

import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";
import { SkeletonDirective } from "../../../../shared/components/ui/skeleton.directive";

/**
 * Port of
 * frontend-react/src/features/dashboard/components/DashboardSkeleton.tsx --
 * placeholder blocks laid out like the real dashboard so the page does not
 * jump when the data lands.
 *
 * It covers the profile card, the chart card and the four stat cards, and
 * deliberately not the activity card: the heatmap has its own inline
 * loading state because it is fetched separately (see the dashboard page).
 */
@Component({
	selector: "app-dashboard-skeleton",
	imports: [SkeletonDirective, ...CARD_DIRECTIVES],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: "block" },
	templateUrl: "./dashboard-skeleton.component.html",
})
export class DashboardSkeletonComponent {
	protected readonly statCards = [1, 2, 3, 4];
}
