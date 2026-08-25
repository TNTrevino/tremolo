import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Router, provideRouter } from "@angular/router";
import { provideIcons } from "@ng-icons/core";
import type { MockInstance } from "vitest";

import { environment } from "../../../../../environments/environment";
import { AuthStore } from "../../../../auth/services/auth.store";
import { TREMOLO_ICONS } from "../../../../core/icons";
import { NotificationService } from "../../../../core/services/notification.service";
import type { UserExport } from "../../models/export.models";
import { AccountPageComponent } from "./account-page.component";

const EMAIL = "baseline.student@tremolo.test";
const PASSWORD_URL = `${environment.coreApi}/api/users/42/password`;
const EMAIL_URL = `${environment.coreApi}/api/users/42/email`;
const EXPORT_URL = `${environment.coreApi}/api/users/42/export`;
const DELETE_URL = `${environment.coreApi}/api/users/42`;

const EXPORT_FIXTURE: UserExport = {
	exported_at: "2026-08-25T00:00:00Z",
	profile: {
		id: 42,
		first_name: "Baseline",
		last_name: "Student",
		email: EMAIL,
		role: "STUDENT",
		instrument: "",
		school: "",
		has_google: false,
		created_date: "2026-01-01",
		created_time: "00:00:00",
	},
	settings: { note_game: null, games: [] },
	keyboard_bindings: null,
	score_entries: [],
	classes: { joined: [], owned: [] },
	assignment_attempts: [],
	friends: [],
};

/**
 * The account page's contract. Password and email changes (#249), the
 * data export (#243), and account deletion (#202) are all real:
 * AccountService's PUT/POST/GET/DELETE calls, asserted here the same way
 * every other HTTP-backed page in this codebase is (HttpTestingController,
 * not a service spy). Deletion keeps one client-side-only check in front
 * of the network call: an instant email-match comparison that saves a
 * round trip on an obvious typo (the server re-checks the same thing
 * regardless), so that one case alone asserts no request went out.
 *
 * Toasts are asserted through the real `NotificationService` rather than a
 * spy: the queue *is* the observable behaviour, and a spy would pass even if
 * the service stopped queueing.
 *
 * Forms in document order: [0] password change (Account Security), [1]
 * email change (Email Management), [2] account deletion (Danger Zone
 * modal, only present once opened). Re-derived after #249 added the
 * email-change form between the other two -- do not guess these indices.
 */
describe("AccountPageComponent", () => {
	let fixture: ComponentFixture<AccountPageComponent>;
	let store: AuthStore;
	let notifications: NotificationService;
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
		notifications = TestBed.inject(NotificationService);
		backend = TestBed.inject(HttpTestingController);
		navigate = vi
			.spyOn(TestBed.inject(Router), "navigateByUrl")
			.mockResolvedValue(true);
		store.setUser({
			id: 42,
			email: EMAIL,
			firstName: "Baseline",
			lastName: "Student",
			role: "STUDENT",
		});
		store.setToken("access-1");
	});

	afterEach(() => {
		backend.verify();
		vi.restoreAllMocks();
	});

	async function render(): Promise<void> {
		fixture = TestBed.createComponent(AccountPageComponent);
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

	async function submitForm(index: number): Promise<void> {
		const forms = el().querySelectorAll("form");
		forms[index]?.dispatchEvent(new Event("submit", { cancelable: true }));
		await fixture.whenStable();
	}

	async function click(label: string): Promise<void> {
		const button = [...el().querySelectorAll("button")].find(
			(b) => b.textContent?.trim() === label,
		);
		button?.click();
		await fixture.whenStable();
	}

	function messages(): (string | undefined)[] {
		return notifications.toasts().map((t) => t.message);
	}

	/** The verified/unverified pill's own text, trimmed -- not a page-wide
	 * substring check, because "Unverified" itself contains "Verified". */
	function emailPill(): string | null {
		const pill = [...el().querySelectorAll("span")].find((s) =>
			/verified/i.test(s.textContent ?? ""),
		);
		return pill?.textContent?.trim() ?? null;
	}

	it("renders the heading and all five section titles", async () => {
		await render();

		expect(el().querySelector("h1")?.textContent?.trim()).toBe(
			"Account Settings",
		);
		const titles = [...el().querySelectorAll("h3")].map((h) =>
			h.textContent?.trim(),
		);
		expect(titles).toEqual([
			"Account Security",
			"Email Management",
			"Privacy Settings",
			"Data & Privacy",
			"Danger Zone",
		]);
	});

	it("labels the password and email-change fields and shows the current email", async () => {
		await render();

		const labels = [...el().querySelectorAll("label")].map((label) => ({
			text: label.textContent?.trim(),
			htmlFor: label.getAttribute("for"),
		}));
		expect(labels).toEqual([
			{ text: "Current Password", htmlFor: "currentPassword" },
			{ text: "New Password", htmlFor: "newPassword" },
			{ text: "Confirm New Password", htmlFor: "confirmPassword" },
			{ text: "Current Password", htmlFor: "emailCurrentPassword" },
			{ text: "New Email Address", htmlFor: "newEmail" },
		]);
		expect(el().textContent).toContain(EMAIL);
	});

	/** Same reason as the login page: `getByLabel("Password")` is a substring match. */
	it("gives no control other than the fields a name containing 'password'", async () => {
		await render();

		const named = [...el().querySelectorAll("[aria-label]")].map((node) =>
			node.getAttribute("aria-label"),
		);
		expect(named.filter((name) => /password/i.test(name ?? ""))).toEqual([]);
	});

	it("reveals all three password fields from the one toggle", async () => {
		await render();
		const ids = ["currentPassword", "newPassword", "confirmPassword"];
		expect(ids.map((id) => input(id).type)).toEqual([
			"password",
			"password",
			"password",
		]);

		const reveal = input("currentPassword").parentElement?.querySelector(
			"button",
		) as HTMLButtonElement;
		reveal.click();
		await fixture.whenStable();
		expect(ids.map((id) => input(id).type)).toEqual(["text", "text", "text"]);

		reveal.click();
		await fixture.whenStable();
		expect(ids.map((id) => input(id).type)).toEqual([
			"password",
			"password",
			"password",
		]);
	});

	it("blocks an invalid password change and raises no toast", async () => {
		await render();
		await submitForm(0);

		expect(el().textContent).toContain("Current password is required");
		expect(el().textContent).toContain("At least 8 characters");
		expect(notifications.toasts()).toEqual([]);
	});

	it("reports mismatched new passwords on the confirm field", async () => {
		await render();
		await type("currentPassword", "Old-Passw0rd!");
		await type("newPassword", "New-Passw0rd!");
		await type("confirmPassword", "Different-Passw0rd!");
		await submitForm(0);

		expect(el().textContent).toContain("Passwords do not match");
		expect(notifications.toasts()).toEqual([]);
	});

	it("posts a password change and clears the form", async () => {
		await render();
		await type("currentPassword", "Old-Passw0rd!");
		await type("newPassword", "New-Passw0rd!");
		await type("confirmPassword", "New-Passw0rd!");
		await submitForm(0);

		const request = backend.expectOne(PASSWORD_URL);
		expect(request.request.method).toBe("PUT");
		expect(request.request.body).toEqual({
			current_password: "Old-Passw0rd!",
			new_password: "New-Passw0rd!",
		});
		request.flush({ message: "Password updated." });
		await fixture.whenStable();

		expect(messages()).toEqual(["Password updated."]);
		expect(input("currentPassword").value).toBe("");
		expect(input("newPassword").value).toBe("");
		expect(input("confirmPassword").value).toBe("");
		// Cleared, not just emptied: no message may be left showing.
		expect(el().textContent).not.toContain("At least 8 characters");
	});

	it("surfaces a wrong current password without clearing", async () => {
		await render();
		await type("currentPassword", "Wrong-Passw0rd!");
		await type("newPassword", "New-Passw0rd!");
		await type("confirmPassword", "New-Passw0rd!");
		await submitForm(0);

		backend
			.expectOne(PASSWORD_URL)
			.flush(
				{ error: "Current password is incorrect" },
				{ status: 400, statusText: "" },
			);
		await fixture.whenStable();

		expect(messages()).toEqual(["Current password is incorrect"]);
		// The visitor must not have to retype everything to fix the one
		// field that was actually wrong.
		expect(input("currentPassword").value).toBe("Wrong-Passw0rd!");
		expect(input("newPassword").value).toBe("New-Passw0rd!");
	});

	it("blocks an invalid email change with no request", async () => {
		await render();
		await submitForm(1);

		expect(el().textContent).toContain("Current password is required");
		expect(el().textContent).toContain("Invalid email format");
		backend.expectNone(() => true);
	});

	it("posts an email change + toasts", async () => {
		await render();
		await type("emailCurrentPassword", "Old-Passw0rd!");
		await type("newEmail", "new.address@tremolo.test");
		await submitForm(1);

		const request = backend.expectOne(EMAIL_URL);
		expect(request.request.method).toBe("POST");
		expect(request.request.body).toEqual({
			current_password: "Old-Passw0rd!",
			new_email: "new.address@tremolo.test",
		});
		request.flush({
			message: "Check your new address for a confirmation link.",
		});
		await fixture.whenStable();

		expect(messages()).toEqual([
			"Check your new address for a confirmation link.",
		]);
		expect(input("emailCurrentPassword").value).toBe("");
		expect(input("newEmail").value).toBe("");
	});

	it("renders the unverified pill when the address is unverified", async () => {
		store.setUser({
			id: 42,
			email: EMAIL,
			firstName: "Baseline",
			lastName: "Student",
			role: "STUDENT",
			emailVerified: false,
		});
		await render();

		expect(emailPill()).toBe("Unverified");
	});

	it("renders the verified pill when the address is verified", async () => {
		store.setUser({
			id: 42,
			email: EMAIL,
			firstName: "Baseline",
			lastName: "Student",
			role: "STUDENT",
			emailVerified: true,
		});
		await render();

		expect(emailPill()).toBe("Verified");
	});

	it("requests, then downloads, a real data export", async () => {
		const objectUrl = "blob:mock-export-url";
		const createObjectURL = vi
			.spyOn(URL, "createObjectURL")
			.mockReturnValue(objectUrl);
		const revokeObjectURL = vi
			.spyOn(URL, "revokeObjectURL")
			.mockReturnValue(undefined);
		let downloadName: string | undefined;
		const anchorClick = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(function (this: HTMLAnchorElement) {
				downloadName = this.download;
			});

		await render();
		await click("Download All My Data");

		const request = backend.expectOne(EXPORT_URL);
		expect(request.request.method).toBe("GET");
		request.flush(EXPORT_FIXTURE);
		await fixture.whenStable();

		expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
		expect(anchorClick).toHaveBeenCalledTimes(1);
		expect(downloadName).toMatch(/^tremolo-data-\d{4}-\d{2}-\d{2}\.json$/);
		expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl);
		expect(messages()).toEqual(["Your data has been downloaded."]);
	});

	it("surfaces an export error as a toast and downloads nothing", async () => {
		const createObjectURL = vi.spyOn(URL, "createObjectURL");

		await render();
		await click("Download All My Data");

		backend
			.expectOne(EXPORT_URL)
			.flush(
				{ error: "Internal server error" },
				{ status: 500, statusText: "" },
			);
		await fixture.whenStable();

		expect(messages()).toEqual(["Internal server error"]);
		expect(createObjectURL).not.toHaveBeenCalled();
	});

	it("opens and dismisses the deletion modal, clearing what was typed, including the password", async () => {
		await render();
		expect(el().textContent).not.toContain("Confirm Account Deletion");

		await click("Delete My Account");
		expect(el().textContent).toContain("Confirm Account Deletion");
		expect(input("emailConfirmation").placeholder).toBe(EMAIL);

		await type("emailConfirmation", "typed@example.com");
		await type("deletePassword", "Some-Passw0rd!");
		await click("Cancel");
		expect(el().textContent).not.toContain("Confirm Account Deletion");

		await click("Delete My Account");
		expect(input("emailConfirmation").value).toBe("");
		expect(input("deletePassword").value).toBe("");
	});

	it("refuses a deletion whose email does not match, keeps the session, and never reaches the network", async () => {
		await render();
		await click("Delete My Account");
		await type("emailConfirmation", "someone.else@tremolo.test");
		await type("deletePassword", "Old-Passw0rd!");
		await submitForm(2);

		expect(messages()).toEqual(["Email does not match your account email"]);
		expect(store.isAuthenticated()).toBe(true);
		expect(navigate).not.toHaveBeenCalled();
		backend.expectNone(() => true);
	});

	it("deletes the account for real, signs out, and lands on the marketing page", async () => {
		await render();
		await click("Delete My Account");
		await type("emailConfirmation", EMAIL);
		await type("deletePassword", "Old-Passw0rd!");
		await submitForm(2);

		const request = backend.expectOne(DELETE_URL);
		expect(request.request.method).toBe("DELETE");
		expect(request.request.body).toEqual({
			password: "Old-Passw0rd!",
			email_confirmation: EMAIL,
		});
		request.flush({ message: "Account deleted" });
		await fixture.whenStable();

		expect(el().textContent).not.toContain("Confirm Account Deletion");
		expect(store.isAuthenticated()).toBe(false);
		expect(store.user()).toBeNull();
		expect(navigate).toHaveBeenCalledWith("/home");
		expect(messages()).toEqual(["Your account has been deleted."]);
	});

	it("shows an incorrect password inline, keeps the modal open, and does not sign out", async () => {
		await render();
		await click("Delete My Account");
		await type("emailConfirmation", EMAIL);
		await type("deletePassword", "Wrong-Passw0rd!");
		await submitForm(2);

		backend
			.expectOne(DELETE_URL)
			.flush({ error: "Incorrect password" }, { status: 403, statusText: "" });
		await fixture.whenStable();

		expect(el().textContent).toContain("Confirm Account Deletion");
		expect(el().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
			"Incorrect password",
		);
		expect(store.isAuthenticated()).toBe(true);
		expect(navigate).not.toHaveBeenCalled();
		// No toast for this failure -- it is shown inline in the modal above.
		expect(messages()).toEqual([]);
	});
});
