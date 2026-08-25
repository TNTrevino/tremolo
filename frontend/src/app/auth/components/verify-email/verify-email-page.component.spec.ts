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
import { TREMOLO_ICONS } from "../../../core/icons";
import { NotificationService } from "../../../core/services/notification.service";
import { AuthStore } from "../../services/auth.store";
import { VerifyEmailPageComponent } from "./verify-email-page.component";

const VERIFY_URL = `${environment.coreApi}/api/auth/verify-email`;
const RESEND_URL = `${environment.coreApi}/api/auth/resend-verification`;

/**
 * Toasts are asserted through the real `NotificationService`, not a spy --
 * same convention account-page.component.spec.ts documents: the queue IS
 * the observable behaviour.
 */
describe("VerifyEmailPageComponent", () => {
	let fixture: ComponentFixture<VerifyEmailPageComponent>;
	let store: AuthStore;
	let notifications: NotificationService;
	let backend: HttpTestingController;

	beforeEach(() => {
		localStorage.clear();
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
		fixture = TestBed.createComponent(VerifyEmailPageComponent);
	});

	afterEach(() => {
		backend.verify();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function messages(): (string | undefined)[] {
		return notifications.toasts().map((t) => t.message);
	}

	function resendButton(): HTMLButtonElement | null {
		return (
			Array.from(el().querySelectorAll("button")).find((b) =>
				b.textContent?.includes("Resend verification email"),
			) ?? null
		);
	}

	it("shows the invalid-link message and sends nothing without a token", async () => {
		await fixture.whenStable();

		expect(el().textContent).toContain(
			"This verification link is invalid or has expired.",
		);
		backend.expectNone(VERIFY_URL);
	});

	it("posts the token from the query string on load", async () => {
		fixture.componentRef.setInput("token", "kula-verify-token");
		await fixture.whenStable();

		const request = backend.expectOne(VERIFY_URL);
		expect(request.request.body).toEqual({ token: "kula-verify-token" });
		request.flush({ message: "Your email address is verified." });
	});

	it("shows a spinner while the verification is in flight", async () => {
		fixture.componentRef.setInput("token", "kula-verify-token");
		await fixture.whenStable();

		expect(el().querySelector('[role="status"]')).not.toBeNull();
		expect(el().textContent).toContain("Verifying your email");

		backend
			.expectOne(VERIFY_URL)
			.flush({ message: "Your email address is verified." });
	});

	it("shows the success message and links onward to /login when signed out", async () => {
		fixture.componentRef.setInput("token", "kula-verify-token");
		await fixture.whenStable();

		backend
			.expectOne(VERIFY_URL)
			.flush({ message: "Your email address is verified." });
		await fixture.whenStable();

		expect(el().textContent).toContain("Your email address is verified.");
		const link = el().querySelector("a") as HTMLAnchorElement;
		expect(link.getAttribute("href")).toBe("/login");
	});

	it("links onward to /dashboard when already signed in", async () => {
		signIn(store, "STUDENT");
		fixture.componentRef.setInput("token", "kula-verify-token");
		await fixture.whenStable();

		backend
			.expectOne(VERIFY_URL)
			.flush({ message: "Your email address is verified." });
		await fixture.whenStable();

		const link = el().querySelector("a") as HTMLAnchorElement;
		expect(link.getAttribute("href")).toBe("/dashboard");
	});

	it("renders the API message for an expired link", async () => {
		fixture.componentRef.setInput("token", "kula-expired-token");
		await fixture.whenStable();

		backend
			.expectOne(VERIFY_URL)
			.flush(
				{ error: "This verification link is invalid or has expired." },
				{ status: 400, statusText: "" },
			);
		await fixture.whenStable();

		expect(el().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
			"This verification link is invalid or has expired.",
		);
	});

	it("hides the resend button on failure when signed out", async () => {
		await fixture.whenStable();

		expect(resendButton()).toBeNull();
	});

	it("resends and toasts when signed in on a failed verification", async () => {
		signIn(store, "STUDENT");
		fixture.componentRef.setInput("token", "kula-expired-token");
		await fixture.whenStable();

		backend
			.expectOne(VERIFY_URL)
			.flush(
				{ error: "This verification link is invalid or has expired." },
				{ status: 400, statusText: "" },
			);
		await fixture.whenStable();

		resendButton()!.click();
		fixture.detectChanges();

		backend
			.expectOne(RESEND_URL)
			.flush({ message: "Verification email sent." });
		await fixture.whenStable();

		expect(messages()).toEqual(["Verification email sent."]);
	});
});
