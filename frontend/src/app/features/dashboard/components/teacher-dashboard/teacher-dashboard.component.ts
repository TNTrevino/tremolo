import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";
import type { UserProfile } from "../../../../shared/models/user.models";

/**
 * Port of frontend-react/src/features/dashboard/components/TeacherDashboard.tsx.
 * Rendered only for a signed-in teacher, below the stats grid.
 *
 * `studentCount` is the summed roster size the dashboard page reads from
 * the teacher's class list. `null` -- while that list is loading, if it
 * fails, or for anyone who isn't a teacher -- still renders "Coming soon".
 */
@Component({
	selector: "app-teacher-dashboard",
	imports: [ButtonComponent, RouterLink, ...CARD_DIRECTIVES],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: "block" },
	templateUrl: "./teacher-dashboard.component.html",
})
export class TeacherDashboardComponent {
	readonly user = input.required<UserProfile>();
	readonly studentCount = input<number | null>(null);

	protected readonly fullName = computed(
		() => `${this.user().firstName} ${this.user().lastName}`,
	);

	protected readonly studentCountLabel = computed(() => {
		const count = this.studentCount();
		return count === null ? "Coming soon" : String(count);
	});
}
