import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideIcons } from "@ng-icons/core";

import { environment } from "../../../../environments/environment";
import { TREMOLO_ICONS } from "../../../core/icons";
import { ForgotPasswordPageComponent } from "./forgot-password-page.component";

const FORGOT_PASSWORD_URL = `${environment.coreApi}/api/auth/forgot-password`;
const CONFIRMATION_MESSAGE =
	"If an account exists for that address, a password reset link is on its way.";

describe("ForgotPasswordPageComponent", () => {
	let fixture: ComponentFixture<ForgotPasswordPageComponent>;
	let backend: HttpTestingController;

	beforeEach(async () => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				provideIcons(TREMOLO_ICONS),
			],
		});
		backend = TestBed.inject(HttpTestingController);

		fixture = TestBed.createComponent(ForgotPasswordPageComponent);
		await fixture.whenStable();
	});

	afterEach(() => {
		backend.verify();
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

	async function submit(): Promise<void> {
		(el().querySelector("form") as HTMLFormElement).dispatchEvent(
			new Event("submit", { cancelable: true }),
		);
		await fixture.whenStable();
	}

	it("renders the heading, label and button", () => {
		expect(el().querySelector("h1")?.textContent?.trim()).toBe(
			"Forgot your password?",
		);

		const label = el().querySelector("label");
		expect(label?.textContent?.trim()).toBe("Email Address");
		expect(label?.getAttribute("for")).toBe("email");

		const submitButton = el().querySelector(
			'button[type="submit"]',
		) as HTMLButtonElement;
		expect(submitButton.textContent?.trim()).toBe("Send reset link");
	});

	it("shows the schema message on submit and sends no request", async () => {
		await submit();

		// #303: an empty box is missing, not malformed.
		expect(el().textContent).toContain("Email is required");
		expect(el().textContent).not.toContain("Invalid email format");
		backend.expectNone(FORGOT_PASSWORD_URL);
	});

	/** #303: the button reveals the message; a plain tab-out does not. */
	it("says nothing when the empty field is tabbed through", async () => {
		input("email").dispatchEvent(new Event("blur"));
		await fixture.whenStable();

		expect(el().textContent).not.toContain("Email is required");
	});

	it("posts the email and swaps the form for the confirmation", async () => {
		await type("email", "student@tremolo.test");
		await submit();

		const request = backend.expectOne(FORGOT_PASSWORD_URL);
		expect(request.request.body).toEqual({ email: "student@tremolo.test" });
		request.flush({ message: CONFIRMATION_MESSAGE });
		await fixture.whenStable();

		expect(el().querySelector("form")).toBeNull();
		expect(el().querySelector('[role="status"]')?.textContent?.trim()).toBe(
			CONFIRMATION_MESSAGE,
		);
	});

	it("shows the identical confirmation for an address with no account", async () => {
		await type("email", "nobody@tremolo.test");
		await submit();

		backend
			.expectOne(FORGOT_PASSWORD_URL)
			.flush({ message: CONFIRMATION_MESSAGE });
		await fixture.whenStable();

		expect(el().querySelector('[role="status"]')?.textContent?.trim()).toBe(
			CONFIRMATION_MESSAGE,
		);
	});

	it("shows an error banner on a server failure", async () => {
		await type("email", "student@tremolo.test");
		await submit();

		backend
			.expectOne(FORGOT_PASSWORD_URL)
			.flush(
				{ error: "Internal server error" },
				{ status: 500, statusText: "" },
			);
		await fixture.whenStable();

		expect(el().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
			"Internal server error",
		);
		expect(el().querySelector("form")).not.toBeNull();
	});
});
