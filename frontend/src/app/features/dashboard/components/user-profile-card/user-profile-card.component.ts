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

	/**
	 * Already human-readable when it arrives -- the Go service formats it as
	 * `"Joined 12 Mar 2024"` (`DTOs/general_user_info_dto.go`), so this is a
	 * pass-through and the template renders it whole rather than prefixing
	 * "Joined " itself.
	 *
	 * React did `new Date(user.createdAt)` on a `created_at` the service has
	 * never sent, so its join date read "Invalid Date". See the merge note in
	 * STATE.md: sub-feature 3 typed the phantom field away, which is what
	 * turned that silent bug into this compile-time fix.
	 */
	protected readonly joinDate = computed(() => this.user().createdDate);

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
				// `general-info` carries no id (it is keyed by the URL), so the
				// name is the only identifier available to name the record.
				this.logger.warn("Missing user.role for user", {
					name: `${user.firstName} ${user.lastName}`,
				});
			}
		});
	}
}
