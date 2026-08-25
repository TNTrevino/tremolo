import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	linkedSignal,
	signal,
} from "@angular/core";
import { NgIcon } from "@ng-icons/core";

import { AuthService } from "../../../auth/services/auth.service";
import { AuthStore } from "../../../auth/services/auth.store";
import { resendVerification } from "../../../auth/utils/resend-verification.util";
import { NotificationService } from "../../services/notification.service";

/**
 * sessionStorage key PREFIX a dismissal is recorded under -- per session,
 * per device, per signed-in user id. #272: a shared classroom Chromebook
 * keeps this component alive (in the app shell) across a sign-out/sign-in,
 * so an un-scoped key would let one student's dismissal hide the banner for
 * whoever signs in next on the same tab.
 */
const DISMISSED_KEY = "tremolo-verify-dismissed";

function dismissedKey(userId: number): string {
	return `${DISMISSED_KEY}:${userId}`;
}

/**
 * Reads the dismissed flag for one user id. Storage can throw (private
 * browsing, quota, a disabled setting), so a read failure just means "not
 * dismissed". No id (nobody signed in) never has a stored dismissal either.
 */
function readDismissed(userId: number | undefined): boolean {
	if (userId === undefined) return false;
	try {
		return sessionStorage.getItem(dismissedKey(userId)) === "1";
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
 *
 * That dismissal is scoped to `store.user()?.id` and re-read from storage
 * every time that id changes (`dismissed` is a `linkedSignal`, not a
 * once-seeded one) -- this component is never destroyed across a
 * sign-out/sign-in, so without that it would keep showing the PREVIOUS
 * user's dismissal to whoever signs in next on the same shared device.
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

	/**
	 * Resets to storage's value for the CURRENT user id whenever
	 * `store.user()` changes identity (sign-in, sign-out, sign-in as
	 * someone else) instead of only seeding once at construction.
	 * `dismiss()` overrides it locally until the next identity change reads
	 * storage again.
	 */
	private readonly dismissed = linkedSignal(() =>
		readDismissed(this.store.user()?.id),
	);

	protected readonly resending = signal(false);

	protected readonly visible = computed(
		() =>
			this.store.isAuthenticated() &&
			this.store.user()?.emailVerified === false &&
			!this.dismissed(),
	);

	protected dismiss(): void {
		this.dismissed.set(true);

		const userId = this.store.user()?.id;
		if (userId === undefined) return;

		try {
			sessionStorage.setItem(dismissedKey(userId), "1");
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
