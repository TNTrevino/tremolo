import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Router, provideRouter } from "@angular/router";
import { provideIcons } from "@ng-icons/core";
import type { MockInstance } from "vitest";

import { environment } from "../../../../environments/environment";
import { TREMOLO_ICONS } from "../../../core/icons";
import { AuthStore } from "../../services/auth.store";
import { ResetPasswordPageComponent } from "./reset-password-page.component";

const RESET_PASSWORD_URL = `${environment.coreApi}/api/auth/reset-password`;

describe("ResetPasswordPageComponent", () => {
	let fixture: ComponentFixture<ResetPasswordPageComponent>;
	let store: AuthStore;
	let backend: HttpTestingController;
	let navigate: MockInstance;

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
		navigate = vi
			.spyOn(TestBed.inject(Router), "navigateByUrl")
			.mockResolvedValue(true);

		fixture = TestBed.createComponent(ResetPasswordPageComponent);
	});

	afterEach(() => {
		backend.verify();
		vi.restoreAllMocks();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function input(id: string): HTMLInputElement {
		return el().querySelector(`#${id}`) as HTMLInputElement;
	}

	async function type(id: string, value: string): Promise<void> {
		const control = input(id);
		control.value = value;
		control.dispatchEvent(new Event("input"));
		await fixture.whenStable();
	}

	async function fillMatchingPasswords(): Promise<void> {
		await type("password", "NewE2ePassw0rd!");
		await type("confirmPassword", "NewE2ePassw0rd!");
	}

	async function submit(): Promise<void> {
		(el().querySelector("form") as HTMLFormElement).dispatchEvent(
			new Event("submit", { cancelable: true }),
		);
		await fixture.whenStable();
	}

	it("shows the invalid-link message and sends nothing without a token", async () => {
		await fixture.whenStable();

		expect(el().querySelector("form")).toBeNull();
		expect(el().textContent).toContain(
			"This password reset link is invalid or has expired.",
		);
		backend.expectNone(RESET_PASSWORD_URL);
	});

	it("shows the mismatched-passwords message on the confirm field", async () => {
		fixture.componentRef.setInput("token", "kula-token-123");
		await fixture.whenStable();

		await type("password", "NewE2ePassw0rd!");
		await type("confirmPassword", "SomethingElse1!");
		await submit();

		expect(el().textContent).toContain("Passwords do not match");
		backend.expectNone(RESET_PASSWORD_URL);
	});

	it("posts the token and password, then lands on /login with the notice", async () => {
		fixture.componentRef.setInput("token", "kula-token-123");
		await fixture.whenStable();

		await fillMatchingPasswords();
		await submit();

		const request = backend.expectOne(RESET_PASSWORD_URL);
		expect(request.request.body).toEqual({
			token: "kula-token-123",
			password: "NewE2ePassw0rd!",
		});
		request.flush({ message: "Password updated. You can now sign in." });
		await fixture.whenStable();

		expect(navigate).toHaveBeenCalledWith("/login");
		expect(store.takeNotice()).toEqual({
			kind: "success",
			message: "Password updated. Please log in.",
		});
	});

	it("renders the API message for an expired link", async () => {
		fixture.componentRef.setInput("token", "kula-expired-token");
		await fixture.whenStable();

		await fillMatchingPasswords();
		await submit();

		backend
			.expectOne(RESET_PASSWORD_URL)
			.flush(
				{ error: "This password reset link is invalid or has expired." },
				{ status: 400, statusText: "" },
			);
		await fixture.whenStable();

		expect(el().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
			"This password reset link is invalid or has expired.",
		);
		expect(navigate).not.toHaveBeenCalled();
	});
});
