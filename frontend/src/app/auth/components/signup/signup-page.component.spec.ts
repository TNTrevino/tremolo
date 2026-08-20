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
import { SignupPageComponent } from "./signup-page.component";

const REGISTER_URL = `${environment.mainApi}/api/auth/register`;

/**
 * The signup page's contract, as `e2e/specs/auth.spec.ts` drives it: six
 * labelled controls (`Password` matched with `exact: true`, so the label
 * must not pick up a required asterisk), a "Create Account" button, and a
 * landing on `/login` showing "Account created! Please log in.".
 */
describe("SignupPageComponent", () => {
	let fixture: ComponentFixture<SignupPageComponent>;
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

		fixture = TestBed.createComponent(SignupPageComponent);
		await fixture.whenStable();
	});

	afterEach(() => {
		backend.verify();
		vi.restoreAllMocks();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function control(id: string): HTMLInputElement | HTMLSelectElement {
		return el().querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement;
	}

	async function type(id: string, value: string): Promise<void> {
		const field = control(id);
		field.value = value;
		field.dispatchEvent(new Event("input"));
		await fixture.whenStable();
	}

	async function choose(id: string, value: string): Promise<void> {
		const field = control(id);
		field.value = value;
		field.dispatchEvent(new Event("change"));
		await fixture.whenStable();
	}

	async function submit(): Promise<void> {
		(el().querySelector("form") as HTMLFormElement).dispatchEvent(
			new Event("submit", { cancelable: true }),
		);
		await fixture.whenStable();
	}

	async function fillValid(): Promise<void> {
		await type("firstName", "Newton");
		await type("lastName", "Signup");
		await type("email", "newton@tremolo.test");
		await type("password", "E2ePassw0rd!");
		await type("confirmPassword", "E2ePassw0rd!");
		await choose("role", "STUDENT");
	}

	it("labels every control, with no asterisk to break an exact match", () => {
		const labels = [...el().querySelectorAll("label")].map((label) => ({
			text: label.textContent?.trim(),
			htmlFor: label.getAttribute("for"),
		}));

		expect(labels).toEqual([
			{ text: "First Name", htmlFor: "firstName" },
			{ text: "Last Name", htmlFor: "lastName" },
			{ text: "Email Address", htmlFor: "email" },
			{ text: "Password", htmlFor: "password" },
			{ text: "Confirm Password", htmlFor: "confirmPassword" },
			{ text: "I am a...", htmlFor: "role" },
		]);
	});

	it("offers the three roles, defaulting to Student", () => {
		const role = control("role") as HTMLSelectElement;

		expect([...role.options].map((option) => option.value)).toEqual([
			"STUDENT",
			"TEACHER",
			"PARENT",
		]);
		expect(role.value).toBe("STUDENT");
	});

	it("renders the heading, the submit button and the link to login", () => {
		expect(el().querySelector("h1")?.textContent?.trim()).toBe(
			"Create Your Account",
		);
		expect(
			(
				el().querySelector('button[type="submit"]') as HTMLButtonElement
			).textContent?.trim(),
		).toBe("Create Account");
		expect(
			[...el().querySelectorAll("a")].map((a) => a.textContent?.trim()),
		).toContain("Login");
		expect(el().textContent).toContain("Sign up with Google");
	});

	it("names no control 'password' except the two fields' own labels", () => {
		const named = [...el().querySelectorAll("[aria-label]")].map((node) =>
			node.getAttribute("aria-label"),
		);
		expect(named.filter((name) => /password/i.test(name ?? ""))).toEqual([]);
	});

	it("keeps the password checklist hidden until the field is used", async () => {
		expect(el().textContent).not.toContain("Password Requirements:");

		await type("password", "a");

		expect(el().textContent).toContain("Password Requirements:");
		expect(el().textContent).toContain("At least 8 characters");
	});

	it("scores password strength the way React did", async () => {
		const component = fixture.componentInstance;

		await type("password", "abc");
		expect(component.strength().label).toBe("Weak");

		await type("password", "abcdefgh");
		expect(component.strength().label).toBe("Weak");

		await type("password", "Abcdefgh");
		expect(component.strength().label).toBe("Fair");

		await type("password", "Abcdefg1");
		expect(component.strength().label).toBe("Good");

		await type("password", "Abcdefg1!");
		expect(component.strength().label).toBe("Strong");
		expect(component.strength().width).toBe("100%");
	});

	/**
	 * The cross-field half of the pattern: `signupSchema`'s `.refine()`
	 * reports on `confirmPassword`, and `validateStandardSchema` puts it on
	 * that field rather than on the form root.
	 */
	it("reports a mismatched confirmation on the confirmation field", async () => {
		await fillValid();
		await type("confirmPassword", "Different1!");
		await submit();

		expect(el().textContent).toContain("Passwords do not match");
		backend.expectNone(REGISTER_URL);
		expect(navigate).not.toHaveBeenCalled();
	});

	it("shows every schema message on an empty submit and sends no request", async () => {
		await submit();

		expect(el().textContent).toContain("At least 2 characters");
		expect(el().textContent).toContain("Invalid email format");
		expect(el().textContent).toContain("At least 8 characters");
		backend.expectNone(REGISTER_URL);
	});

	it("registers with snake_case keys and does not sign the account in", async () => {
		await fillValid();
		await submit();

		const request = backend.expectOne(REGISTER_URL);
		expect(request.request.body).toEqual({
			email: "newton@tremolo.test",
			password: "E2ePassw0rd!",
			first_name: "Newton",
			last_name: "Signup",
			role: "STUDENT",
		});

		request.flush({
			message: "created",
			user: {
				id: 1,
				email: "newton@tremolo.test",
				first_name: "Newton",
				last_name: "Signup",
				role: "STUDENT",
			},
		});
		await fixture.whenStable();

		expect(store.isAuthenticated()).toBe(false);
		expect(navigate).toHaveBeenCalledWith("/login");
		expect(store.takeNotice()).toEqual({
			kind: "success",
			message: "Account created! Please log in.",
		});
	});

	it("shows the server's message on a rejected registration and stays put", async () => {
		await fillValid();
		await submit();

		backend
			.expectOne(REGISTER_URL)
			.flush(
				{ error: "Email already registered" },
				{ status: 400, statusText: "" },
			);
		await fixture.whenStable();

		expect(el().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
			"Email already registered",
		);
		expect(navigate).not.toHaveBeenCalled();
	});
});
