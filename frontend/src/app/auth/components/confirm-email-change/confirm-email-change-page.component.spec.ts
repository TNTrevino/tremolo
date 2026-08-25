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
import { AuthStore } from "../../services/auth.store";
import { ConfirmEmailChangePageComponent } from "./confirm-email-change-page.component";

const CONFIRM_URL = `${environment.coreApi}/api/auth/confirm-email-change`;
const ME_URL = `${environment.coreApi}/api/auth/me`;

describe("ConfirmEmailChangePageComponent", () => {
	let fixture: ComponentFixture<ConfirmEmailChangePageComponent>;
	let store: AuthStore;
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
		backend = TestBed.inject(HttpTestingController);
		fixture = TestBed.createComponent(ConfirmEmailChangePageComponent);
	});

	afterEach(() => {
		backend.verify();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	it("shows the invalid-link message and sends nothing without a token", async () => {
		await fixture.whenStable();

		expect(el().textContent).toContain(
			"This email confirmation link is invalid or has expired.",
		);
		backend.expectNone(CONFIRM_URL);
	});

	it("posts the token from the query string on load", async () => {
		fixture.componentRef.setInput("token", "kula-confirm-token");
		await fixture.whenStable();

		const request = backend.expectOne(CONFIRM_URL);
		expect(request.request.body).toEqual({ token: "kula-confirm-token" });
		request.flush({
			message: "Your email address has been updated.",
			email: "new.address@tremolo.test",
		});
	});

	it("shows a spinner while the confirmation is in flight", async () => {
		fixture.componentRef.setInput("token", "kula-confirm-token");
		await fixture.whenStable();

		expect(el().querySelector('[role="status"]')).not.toBeNull();
		expect(el().textContent).toContain("Confirming your new email address");

		backend.expectOne(CONFIRM_URL).flush({
			message: "Your email address has been updated.",
			email: "new.address@tremolo.test",
		});
	});

	it("renders the new address and refreshes the stored user when signed in", async () => {
		signIn(store, "STUDENT");
		fixture.componentRef.setInput("token", "kula-confirm-token");
		await fixture.whenStable();

		backend.expectOne(CONFIRM_URL).flush({
			message: "Your email address has been updated.",
			email: "new.address@tremolo.test",
		});
		await fixture.whenStable();

		expect(el().textContent).toContain("Your email address has been updated.");
		expect(el().textContent).toContain("new.address@tremolo.test");

		backend.expectOne(ME_URL).flush({
			id: 1,
			email: "new.address@tremolo.test",
			first_name: "Test",
			last_name: "User",
			role: "STUDENT",
			email_verified: true,
		});
		await fixture.whenStable();

		expect(store.user()?.email).toBe("new.address@tremolo.test");
	});

	it("does not refresh the store when signed out", async () => {
		fixture.componentRef.setInput("token", "kula-confirm-token");
		await fixture.whenStable();

		backend.expectOne(CONFIRM_URL).flush({
			message: "Your email address has been updated.",
			email: "new.address@tremolo.test",
		});
		await fixture.whenStable();

		backend.expectNone(ME_URL);
	});

	it("renders the API message for an expired link", async () => {
		fixture.componentRef.setInput("token", "kula-expired-token");
		await fixture.whenStable();

		backend
			.expectOne(CONFIRM_URL)
			.flush(
				{ error: "This email confirmation link is invalid or has expired." },
				{ status: 400, statusText: "" },
			);
		await fixture.whenStable();

		expect(el().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
			"This email confirmation link is invalid or has expired.",
		);
	});

	it("renders the API message when the address was taken at confirm time", async () => {
		fixture.componentRef.setInput("token", "kula-collision-token");
		await fixture.whenStable();

		backend
			.expectOne(CONFIRM_URL)
			.flush(
				{ error: "That email address is already in use." },
				{ status: 409, statusText: "" },
			);
		await fixture.whenStable();

		expect(el().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
			"That email address is already in use.",
		);
	});
});
