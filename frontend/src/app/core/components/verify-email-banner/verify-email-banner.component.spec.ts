import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideIcons } from "@ng-icons/core";

import { environment } from "../../../../environments/environment";
import { signIn } from "../../../../testing/auth-fixtures";
import { AuthStore } from "../../../auth/services/auth.store";
import { TREMOLO_ICONS } from "../../icons";
import { NotificationService } from "../../services/notification.service";
import { VerifyEmailBannerComponent } from "./verify-email-banner.component";

const RESEND_URL = `${environment.coreApi}/api/auth/resend-verification`;

/**
 * Toasts are asserted through the real `NotificationService`, not a spy --
 * same convention account-page.component.spec.ts documents: the queue IS
 * the observable behaviour, and a spy would pass even if the service
 * stopped queueing.
 */
describe("VerifyEmailBannerComponent", () => {
	let fixture: ComponentFixture<VerifyEmailBannerComponent>;
	let store: AuthStore;
	let notifications: NotificationService;
	let backend: HttpTestingController;

	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				provideIcons(TREMOLO_ICONS),
			],
		});
		store = TestBed.inject(AuthStore);
		notifications = TestBed.inject(NotificationService);
		backend = TestBed.inject(HttpTestingController);
		fixture = TestBed.createComponent(VerifyEmailBannerComponent);
	});

	afterEach(() => {
		backend.verify();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function banner(): HTMLElement | null {
		return el().querySelector('[role="status"]');
	}

	function messages(): (string | undefined)[] {
		return notifications.toasts().map((t) => t.message);
	}

	it("renders nothing when signed out", async () => {
		await fixture.whenStable();

		expect(banner()).toBeNull();
	});

	it("renders nothing for a verified user", async () => {
		signIn(store, "STUDENT");
		await fixture.whenStable();

		expect(banner()).toBeNull();
	});

	/**
	 * A session persisted before #108 shipped has no `emailVerified` key at
	 * all -- setUser here (rather than the signIn fixture, which always
	 * sets it) is what reproduces that: `user()?.emailVerified` reads
	 * `undefined`, and the banner's `=== false` check must not treat that
	 * as "unverified".
	 */
	it("renders nothing when emailVerified is undefined (a pre-#108 session)", async () => {
		store.setUser({
			id: 1,
			email: "old@tremolo.test",
			firstName: "Old",
			lastName: "Session",
			role: "STUDENT",
		});
		store.setToken("access-token");
		await fixture.whenStable();

		expect(banner()).toBeNull();
	});

	it("prompts an unverified signed-in user", async () => {
		signIn(store, "STUDENT", false);
		await fixture.whenStable();

		const shown = banner();
		expect(shown).not.toBeNull();
		expect(shown!.textContent).toContain("Please verify your email address.");
	});

	it("resends and toasts on the real notification queue", async () => {
		signIn(store, "STUDENT", false);
		await fixture.whenStable();

		const resend = Array.from(el().querySelectorAll("button")).find((b) =>
			b.textContent?.includes("Resend verification email"),
		)!;
		resend.click();
		fixture.detectChanges();

		backend
			.expectOne(RESEND_URL)
			.flush({ message: "Verification email sent." });
		await fixture.whenStable();

		expect(messages()).toEqual(["Verification email sent."]);
	});

	it("stays dismissed for the session, even across a fresh component instance", async () => {
		signIn(store, "STUDENT", false);
		await fixture.whenStable();

		const dismiss = el().querySelector(
			'button[aria-label="Dismiss"]',
		) as HTMLButtonElement;
		dismiss.click();
		fixture.detectChanges();

		expect(banner()).toBeNull();

		// A route navigation destroys and recreates this component (it lives
		// in the app shell, not in a route, but the same TestBed component
		// re-creation stands in for "the page reloaded a component that
		// reads sessionStorage fresh"). The dismissal must survive that.
		const second = TestBed.createComponent(VerifyEmailBannerComponent);
		await second.whenStable();

		expect(
			(second.nativeElement as HTMLElement).querySelector('[role="status"]'),
		).toBeNull();
	});
});
