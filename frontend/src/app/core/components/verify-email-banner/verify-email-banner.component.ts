import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
} from "@angular/core";
import { NgIcon } from "@ng-icons/core";

import { AuthService } from "../../../auth/services/auth.service";
import { AuthStore } from "../../../auth/services/auth.store";
import { resendVerification } from "../../../auth/utils/resend-verification.util";
import { NotificationService } from "../../services/notification.service";

/** sessionStorage key a dismissal is recorded under -- per session, per device. */
const DISMISSED_KEY = "tremolo-verify-dismissed";

/** Reads the dismissed flag. Storage can throw (private browsing, quota, a disabled setting), so a read failure just means "not dismissed". */
function readDismissed(): boolean {
	try {
		return sessionStorage.getItem(DISMISSED_KEY) === "1";
	} catch {
		return false;
	}
}

/**
 * #108: a slim banner nudging a signed-in, unverified user to confirm
 * their email address. Sits in app.component.html, right after
 * `<app-navigation />`, so it survives navigation the same way the toast
 * container and friends panel do.
 *
 * Renders only when `store.isAuthenticated() &&
 * store.user()?.emailVerified === false`. The `=== false` check is
 * deliberate: a session persisted to localStorage *before this shipped*
 * has no `emailVerified` key at all -- `AuthStore.hydrate()` parses that
 * stored JSON directly, bypassing `mapApiUserToUser`'s `?? false`
 * fallback -- so `user()?.emailVerified` there reads `undefined`, not
 * `false`. `undefined !== false`, so the banner stays hidden for that
 * pre-existing session rather than nagging every user who was already
 * signed in before this feature shipped; it starts showing correctly the
 * next time that session gets a fresh login or /me response.
 *
 * Dismissal is sessionStorage, not the server: it is a "not now" for this
 * browser tab's session, not an acknowledgement anything remembers.
 */
@Component({
	selector: "app-verify-email-banner",
	imports: [NgIcon],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (visible()) {
			<div
				role="status"
				class="flex flex-wrap items-center justify-center gap-3 border-b-2 border-border bg-muted px-4 py-2 text-center text-sm"
			>
				<ng-icon
					name="lucideMail"
					class="h-4 w-4 shrink-0 text-muted-foreground"
					aria-hidden="true"
				/>
				<span>Please verify your email address.</span>
				<button
					type="button"
					class="font-medium text-primary underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
					[disabled]="resending()"
					(click)="resend()"
				>
					Resend verification email
				</button>
				<button
					type="button"
					class="text-muted-foreground transition-colors hover:text-foreground"
					aria-label="Dismiss"
					(click)="dismiss()"
				>
					<ng-icon name="lucideX" class="h-4 w-4" aria-hidden="true" />
				</button>
			</div>
		}
	`,
})
export class VerifyEmailBannerComponent {
	private readonly store = inject(AuthStore);
	private readonly auth = inject(AuthService);
	private readonly notifications = inject(NotificationService);

	private readonly dismissed = signal(readDismissed());

	protected readonly resending = signal(false);

	protected readonly visible = computed(
		() =>
			this.store.isAuthenticated() &&
			this.store.user()?.emailVerified === false &&
			!this.dismissed(),
	);

	protected dismiss(): void {
		this.dismissed.set(true);
		try {
			sessionStorage.setItem(DISMISSED_KEY, "1");
		} catch {
			// The in-memory signal above already hid the banner for the rest
			// of this page load, which is what actually matters -- a failed
			// write just means it may reappear on the next full reload.
		}
	}

	protected resend(): void {
		resendVerification(this.auth, this.notifications, this.resending);
	}
}
