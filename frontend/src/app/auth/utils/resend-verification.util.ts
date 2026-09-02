import type { WritableSignal } from "@angular/core";

import { getErrorMessage } from "../../shared/utils/error.utils";
import type { NotificationService } from "../../core/services/notification.service";
import type { AuthService } from "../services/auth.service";

/**
 * #108: fires POST /api/auth/resend-verification, tracking an in-flight
 * signal and toasting the result. Shared by VerifyEmailBannerComponent and
 * VerifyEmailPageComponent, whose "Resend verification email" buttons do
 * exactly this and nothing else -- each just owns its own `resending`
 * signal so its own template can disable the button while a request is in
 * flight.
 */
export function resendVerification(
	auth: AuthService,
	notifications: NotificationService,
	resending: WritableSignal<boolean>,
): void {
	if (resending()) return;
	resending.set(true);

	auth.resendVerification().subscribe({
		next: (res) => {
			resending.set(false);
			notifications.showSuccess(res.message);
		},
		error: (err: unknown) => {
			resending.set(false);
			notifications.showError(getErrorMessage(err));
		},
	});
}
