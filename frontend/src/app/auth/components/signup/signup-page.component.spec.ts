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

const REGISTER_URL = `${environment.coreApi}/api/auth/register`;

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
		// signupSchema now requires a grade from a STUDENT (#244); this
		// keeps every existing "fill the form out correctly" test isolated
		// to the one thing it means to exercise.
		await choose("gradeLevel", "8");
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
			{ text: "What grade are you in?", htmlFor: "gradeLevel" },
		]);
	});

	it("offers Student and Teacher only, defaulting to Student", () => {
		const role = control("role") as HTMLSelectElement;

		expect([...role.options].map((option) => option.value)).toEqual([
			"STUDENT",
			"TEACHER",
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

	/**
	 * The two reveal toggles carry accessible names (DESIGN.md rule 7), and
	 * `page.getByLabel("Password")` / `getByLabel("Confirm Password")` in the
	 * parity suite are now `exact: true` (e2e/specs/auth.spec.ts), so these
	 * names can safely mention "password" as long as neither is exactly
	 * "Password" or "Confirm Password" -- those exact strings must still
	 * resolve to the fields alone.
	 */
	it("labels both password toggles without colliding with a field's own exact-match name", () => {
		const reveal = control("password").parentElement?.querySelector(
			"button",
		) as HTMLButtonElement;
		const revealConfirm = control(
			"confirmPassword",
		).parentElement?.querySelector("button") as HTMLButtonElement;

		expect(reveal.getAttribute("aria-label")).toBe("Show password");
		expect(reveal.getAttribute("aria-label")).not.toBe("Password");
		expect(revealConfirm.getAttribute("aria-label")).toBe(
			"Show confirm password",
		);
		expect(revealConfirm.getAttribute("aria-label")).not.toBe(
			"Confirm Password",
		);
	});

	/**
	 * #242: the agreement line sits under the submit button, above the "Or
	 * continue with" divider. Both anchors reuse the page's existing Login
	 * link classes -- `.toContain` above means this cannot regress that link.
	 */
	it("shows the terms and privacy agreement line, linked to both pages", () => {
		const anchors = [...el().querySelectorAll("a")];
		const terms = anchors.find(
			(a) => a.textContent?.trim() === "Terms of Service",
		);
		const privacy = anchors.find(
			(a) => a.textContent?.trim() === "Privacy Policy",
		);

		expect(terms?.getAttribute("href")).toBe("/terms");
		expect(privacy?.getAttribute("href")).toBe("/privacy");
		expect(el().textContent).toContain(
			"By creating an account you agree to our",
		);
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

	/**
	 * bcrypt's hard limit (#269 review): a password this long previously
	 * reached the Go service and errored out of bcrypt.GenerateFromPassword.
	 * `signupSchema`'s `.max(72, ...)` catches it client-side first.
	 */
	it("rejects a password over bcrypt's 72-byte limit and sends no request", async () => {
		const tooLong = "Aa1!" + "a".repeat(69); // 73 characters
		await fillValid();
		await type("password", tooLong);
		await type("confirmPassword", tooLong);
		await submit();

		expect(el().textContent).toContain("At most 72 characters");
		backend.expectNone(REGISTER_URL);
		expect(navigate).not.toHaveBeenCalled();
	});

	/**
	 * #303 is the screenshot on that issue: four red lines under four empty
	 * boxes, and each one told the visitor the wrong thing. An empty box is
	 * missing, not too short and not malformed.
	 */
	it("shows every schema message on an empty submit and sends no request", async () => {
		await submit();

		expect(el().textContent).toContain("First name is required");
		expect(el().textContent).toContain("Last name is required");
		expect(el().textContent).toContain("Email is required");
		expect(el().textContent).toContain("Password is required");
		expect(el().textContent).not.toContain("At least 2 characters");
		expect(el().textContent).not.toContain("Invalid email format");
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
			grade_level: "8",
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

	// ---------- the teacher invite code (#250) ----------

	/** Fills the form as a teacher, optionally typing a code. */
	async function fillValidTeacher(inviteCode = ""): Promise<void> {
		await fillValid();
		await choose("role", "TEACHER");
		if (inviteCode) await type("inviteCode", inviteCode);
	}

	/** The messages `app-form-field` is showing under its controls. */
	function fieldMessages(): (string | undefined)[] {
		return [...el().querySelectorAll("app-form-error p")].map((p) =>
			p.textContent?.trim(),
		);
	}

	/**
	 * Runs a teacher signup with `inviteCode` and flushes the server's
	 * standard "invalid, expired or spent" rejection for it.
	 */
	async function rejectInviteCode(inviteCode = "ZZZZZZZZ"): Promise<void> {
		await fillValidTeacher(inviteCode);
		await submit();

		backend.expectOne(REGISTER_URL).flush(
			{
				error:
					"That invite code is not valid, has expired, or has already been used.",
				field: "invite_code",
			},
			{ status: 400, statusText: "" },
		);
		await fixture.whenStable();
	}

	it("hides the invite code field until Teacher is chosen", async () => {
		expect(control("inviteCode")).toBeNull();
		expect(el().textContent).not.toContain(
			"Ask your Tremolo contact for a code.",
		);

		await choose("role", "TEACHER");

		expect(control("inviteCode")).not.toBeNull();
		expect(
			el().querySelector('label[for="inviteCode"]')?.textContent?.trim(),
		).toBe("Invite code");
		expect(el().textContent).toContain("Ask your Tremolo contact for a code.");
	});

	it("requires an invite code for a teacher signup", async () => {
		await fillValidTeacher();
		await submit();

		expect(el().textContent).toContain(
			"Invite code is required for teacher accounts",
		);
		backend.expectNone(REGISTER_URL);
		expect(navigate).not.toHaveBeenCalled();
	});

	it("sends invite_code only for a teacher signup", async () => {
		await fillValidTeacher("  abcd2345  ");
		await submit();

		const request = backend.expectOne(REGISTER_URL);
		expect(request.request.body).toEqual({
			email: "newton@tremolo.test",
			password: "E2ePassw0rd!",
			first_name: "Newton",
			last_name: "Signup",
			role: "TEACHER",
			invite_code: "abcd2345",
		});

		request.flush({
			message: "created",
			user: {
				id: 2,
				email: "newton@tremolo.test",
				first_name: "Newton",
				last_name: "Signup",
				role: "TEACHER",
			},
		});
		await fixture.whenStable();
	});

	/**
	 * The Go service marks this one rejection with `field: "invite_code"`
	 * so it can land under the input the user has to retype, rather than in
	 * the alert at the top of a form they would have to scroll back up to.
	 */
	it("puts a rejected invite code on the field, not the page alert", async () => {
		await rejectInviteCode();

		expect(fieldMessages()).toContain(
			"That invite code is not valid, has expired, or has already been used.",
		);
		expect(el().querySelector('[role="alert"]')).toBeNull();
		expect(navigate).not.toHaveBeenCalled();
	});

	it("keeps a non-field register error in the page alert", async () => {
		await fillValidTeacher("ABCD2345");
		await submit();

		backend
			.expectOne(REGISTER_URL)
			.flush(
				{ error: "Email already exists" },
				{ status: 400, statusText: "" },
			);
		await fixture.whenStable();

		expect(el().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
			"Email already exists",
		);
		expect(fieldMessages()).not.toContain("Email already exists");
	});

	it("clears the invite code field when switching back to Student", async () => {
		await rejectInviteCode();

		await choose("role", "STUDENT");

		expect(control("inviteCode")).toBeNull();
		expect(el().textContent).not.toContain("That invite code is not valid");
	});

	// ---------- the grade level (#244) ----------

	it("shows the grade field for Student, hides it for Teacher", async () => {
		expect(control("gradeLevel")).not.toBeNull();
		expect(
			el().querySelector('label[for="gradeLevel"]')?.textContent?.trim(),
		).toBe("What grade are you in?");

		await choose("role", "TEACHER");

		expect(control("gradeLevel")).toBeNull();
	});

	it("requires a grade for a student signup", async () => {
		await type("firstName", "Newton");
		await type("lastName", "Signup");
		await type("email", "newton@tremolo.test");
		await type("password", "E2ePassw0rd!");
		await type("confirmPassword", "E2ePassw0rd!");
		// role defaults to STUDENT; gradeLevel is left at "".
		await submit();

		expect(el().textContent).toContain("Please choose your grade");
		backend.expectNone(REGISTER_URL);
		expect(navigate).not.toHaveBeenCalled();
	});

	it("sends grade_level for a student signup", async () => {
		await fillValid();
		await submit();

		const request = backend.expectOne(REGISTER_URL);
		expect(request.request.body).toMatchObject({ grade_level: "8" });
	});

	it("omits grade_level for a teacher signup", async () => {
		await fillValidTeacher("ABCD2345");
		await submit();

		const request = backend.expectOne(REGISTER_URL);
		expect(request.request.body).not.toHaveProperty("grade_level");
	});

	/**
	 * `isStudent()`/`isTeacher()` only ever toggle which field is shown --
	 * neither field's underlying value is reset by the switch, the same way
	 * a rejected invite code's value (as opposed to its error, which
	 * `linkedSignal` does clear) survives a round trip through Student.
	 * This pins that the grade a user already chose is not silently
	 * dropped by a detour through Teacher, so re-submitting as a Student
	 * does not force them to answer the question twice.
	 */
	it("keeps a chosen grade across a round trip through Teacher", async () => {
		await fillValid();

		await choose("role", "TEACHER");
		await type("inviteCode", "ABCD2345");
		await choose("role", "STUDENT");

		expect(control("gradeLevel")).not.toBeNull();
		expect((control("gradeLevel") as HTMLSelectElement).value).toBe("8");

		await submit();

		const request = backend.expectOne(REGISTER_URL);
		expect(request.request.body).toMatchObject({ grade_level: "8" });
	});
});
