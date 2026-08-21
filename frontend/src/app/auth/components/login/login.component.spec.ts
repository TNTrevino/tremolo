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
import { LoginPageComponent } from "./login.component";

const LOGIN_URL = `${environment.coreApi}/api/auth/login`;

const LOGIN_RESPONSE = {
	user: {
		id: 7,
		email: "student@tremolo.test",
		first_name: "Stu",
		last_name: "Dent",
		role: "STUDENT" as const,
	},
	access_token: "access-1",
	refresh_token: "refresh-1",
};

/**
 * The login page's contract, as the parity suite sees it
 * (`e2e/specs/auth.spec.ts` + `e2e/support/app.ts`): a "Welcome to Tremolo"
 * heading, "Email Address" and "Password" labels, a "Sign In" button
 * matched with `exact: true`, and a wrong password that shows a message
 * without navigating.
 */
describe("LoginPageComponent", () => {
	let fixture: ComponentFixture<LoginPageComponent>;
	let store: AuthStore;
	let backend: HttpTestingController;
	let navigate: MockInstance;

	beforeEach(async () => {
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
	});

	afterEach(() => {
		backend.verify();
		vi.restoreAllMocks();
	});

	async function render(): Promise<void> {
		fixture = TestBed.createComponent(LoginPageComponent);
		await fixture.whenStable();
	}

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

	async function fillValidCredentials(): Promise<void> {
		await type("email", "student@tremolo.test");
		await type("password", "E2ePassw0rd!");
	}

	it("renders the heading, labels and button the parity suite selects on", async () => {
		await render();

		expect(el().querySelector("h1")?.textContent?.trim()).toBe(
			"Welcome to Tremolo",
		);

		const labels = [...el().querySelectorAll("label")].map((label) => ({
			text: label.textContent?.trim(),
			htmlFor: label.getAttribute("for"),
		}));
		expect(labels).toEqual([
			{ text: "Email Address", htmlFor: "email" },
			{ text: "Password", htmlFor: "password" },
		]);

		const submitButton = el().querySelector(
			'button[type="submit"]',
		) as HTMLButtonElement;
		expect(submitButton.textContent?.trim()).toBe("Sign In");
	});

	/**
	 * Guards the E2E suite, not the user: `page.getByLabel("Password")` is a
	 * substring match, so an `aria-label` like "Show password" on the reveal
	 * toggle would match the field *and* the button and trip Playwright's
	 * strict mode. React leaves that button unnamed for the same reason.
	 */
	it("gives no control other than the field a name containing 'password'", async () => {
		await render();

		const named = [...el().querySelectorAll("[aria-label]")].map((node) =>
			node.getAttribute("aria-label"),
		);
		expect(named.filter((name) => /password/i.test(name ?? ""))).toEqual([]);
	});

	it("offers a link to signup and a Google button", async () => {
		await render();

		expect(
			[...el().querySelectorAll("a")].map((a) => a.textContent?.trim()),
		).toContain("Sign up");
		expect(el().textContent).toContain("Sign in with Google");
	});

	it("toggles the password field between hidden and visible", async () => {
		await render();

		const reveal = input("password").parentElement?.querySelector(
			"button",
		) as HTMLButtonElement;
		expect(input("password").type).toBe("password");

		reveal.click();
		await fixture.whenStable();
		expect(input("password").type).toBe("text");

		reveal.click();
		await fixture.whenStable();
		expect(input("password").type).toBe("password");
	});

	it("shows every schema message on submit and sends no request", async () => {
		await render();
		await submit();

		expect(el().textContent).toContain("Invalid email format");
		expect(el().textContent).toContain("Password is required");
		backend.expectNone(LOGIN_URL);
		expect(navigate).not.toHaveBeenCalled();
	});

	it("signs in and lands on the dashboard", async () => {
		await render();
		await fillValidCredentials();
		await submit();

		const request = backend.expectOne(LOGIN_URL);
		expect(request.request.body).toEqual({
			email: "student@tremolo.test",
			password: "E2ePassw0rd!",
		});
		request.flush(LOGIN_RESPONSE);
		await fixture.whenStable();

		expect(store.isAuthenticated()).toBe(true);
		expect(navigate).toHaveBeenCalledWith("/dashboard", { replaceUrl: true });
	});

	it("returns the visitor to the page the guard bounced them from, once", async () => {
		store.redirectUrl.set("/assignments");
		await render();
		await fillValidCredentials();
		await submit();

		backend.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
		await fixture.whenStable();

		expect(navigate).toHaveBeenCalledWith("/assignments", {
			replaceUrl: true,
		});
		expect(store.redirectUrl()).toBeNull();
	});

	it("shows the server's message on a rejected password and stays put", async () => {
		await render();
		await fillValidCredentials();
		await submit();

		backend
			.expectOne(LOGIN_URL)
			.flush({ error: "Invalid credentials" }, { status: 401, statusText: "" });
		await fixture.whenStable();

		expect(el().textContent).toContain("Invalid credentials");
		expect(navigate).not.toHaveBeenCalled();
		expect(
			(el().querySelector('button[type="submit"]') as HTMLButtonElement)
				.disabled,
		).toBe(false);
	});

	it("shows the notice signup left behind, and only once", async () => {
		store.setNotice("success", "Account created! Please log in.");
		await render();

		expect(el().textContent).toContain("Account created! Please log in.");

		// One-shot: react-router's location state did not survive the next
		// navigation either.
		const second = TestBed.createComponent(LoginPageComponent);
		await second.whenStable();
		expect((second.nativeElement as HTMLElement).textContent).not.toContain(
			"Account created!",
		);
	});

	it("shows the notice a failed Google callback left behind", async () => {
		store.setNotice("error", "OAuth callback missing required parameters.");
		await render();

		const alert = el().querySelector('[role="alert"]');
		expect(alert?.textContent?.trim()).toBe(
			"OAuth callback missing required parameters.",
		);
	});
});
