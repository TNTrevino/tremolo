import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	input,
} from "@angular/core";

import { LoggerService } from "../../../../core/services/logger.service";
import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";
import type { UserProfile } from "../../../../shared/models/user.models";

/**
 * Port of frontend-react/src/features/dashboard/components/UserProfileCard.tsx.
 *
 * Initials avatar, name, role chip, join month, and the two quick stats.
 *
 * **The name heading is an acceptance criterion.** `e2e/specs/auth.spec.ts`'s
 * "signs in and lands on the dashboard" asserts that the signed-in user's
 * "First Last" is visible after login, and this `<h1>` is the only place the
 * dashboard renders it. It was the parity suite's one known failure through
 * Phase 3.1.
 */
@Component({
	selector: "app-user-profile-card",
	imports: [...CARD_DIRECTIVES],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: "block" },
	templateUrl: "./user-profile-card.component.html",
})
export class UserProfileCardComponent {
	private readonly logger = inject(LoggerService);

	readonly user = input.required<UserProfile>();
	readonly totalSessions = input.required<number>();
	readonly timeReading = input.required<string>();

	protected readonly fullName = computed(
		() => `${this.user().firstName} ${this.user().lastName}`,
	);

	protected readonly initials = computed(() => {
		const user = this.user();
		return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
	});

	protected readonly joinDate = computed(() =>
		new Date(this.user().createdAt).toLocaleDateString("en-US", {
			month: "long",
			year: "numeric",
		}),
	);

	/** "STUDENT" -> "Student". */
	protected readonly roleDisplay = computed(() => {
		const role = this.user().role;
		return role ? role.charAt(0) + role.slice(1).toLowerCase() : "User";
	});

	constructor() {
		// React warned from inside the render function. Here the warning lives
		// in an effect rather than in `roleDisplay`, so the computed stays pure
		// -- a computed that logs fires again on every dependency change and
		// never on a cache hit, which makes the log say nothing reliable.
		effect(() => {
			const user = this.user();
			if (!user.role) {
				this.logger.warn("Missing user.role for user", { userId: user.id });
			}
		});
	}
}
