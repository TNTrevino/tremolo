import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Router, provideRouter } from "@angular/router";
import { provideIcons } from "@ng-icons/core";
import type { MockInstance } from "vitest";

import { AuthStore } from "../../../../auth/services/auth.store";
import { TREMOLO_ICONS } from "../../../../core/icons";
import { NotificationService } from "../../../../core/services/notification.service";
import { AccountPageComponent } from "./account-page.component";

const EMAIL = "baseline.student@tremolo.test";

/**
 * The account page's contract. Everything on it is still a promise -- React
 * answered all three actions with a toast because the Go service has no
 * route for any of them -- so what these tests pin is the wording of those
 * toasts, the client-side validation in front of them, and the one action
 * that does have a real effect: the confirmed deletion signs the user out.
 *
 * Toasts are asserted through the real `NotificationService` rather than a
 * spy: the queue *is* the observable behaviour, and a spy would pass even if
 * the service stopped queueing.
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

	it("labels the three password fields and shows the current email", async () => {
		await render();

		const labels = [...el().querySelectorAll("label")].map((label) => ({
			text: label.textContent?.trim(),
			htmlFor: label.getAttribute("for"),
		}));
		expect(labels).toEqual([
			{ text: "Current Password", htmlFor: "currentPassword" },
			{ text: "New Password", htmlFor: "newPassword" },
			{ text: "Confirm New Password", htmlFor: "confirmPassword" },
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

	it("answers a valid password change with the coming-soon notice and clears the form", async () => {
		await render();
		await type("currentPassword", "Old-Passw0rd!");
		await type("newPassword", "New-Passw0rd!");
		await type("confirmPassword", "New-Passw0rd!");
		await submitForm(0);

		expect(messages()).toEqual(["Password update functionality coming soon!"]);
		expect(input("currentPassword").value).toBe("");
		expect(input("newPassword").value).toBe("");
		expect(input("confirmPassword").value).toBe("");
		// Cleared, not just emptied: no message may be left showing.
		expect(el().textContent).not.toContain("At least 8 characters");
	});

	it("answers the data download with the coming-soon notice", async () => {
		await render();
		await click("Download All My Data");

		expect(messages()).toEqual([
			"Your data download will begin shortly. (Feature coming soon)",
		]);
	});

	it("opens and dismisses the deletion modal, clearing what was typed", async () => {
		await render();
		expect(el().textContent).not.toContain("Confirm Account Deletion");

		await click("Delete My Account");
		expect(el().textContent).toContain("Confirm Account Deletion");
		expect(input("emailConfirmation").placeholder).toBe(EMAIL);

		await type("emailConfirmation", "typed@example.com");
		await click("Cancel");
		expect(el().textContent).not.toContain("Confirm Account Deletion");

		await click("Delete My Account");
		expect(input("emailConfirmation").value).toBe("");
	});

	it("refuses a deletion whose email does not match, and keeps the session", async () => {
		await render();
		await click("Delete My Account");
		await type("emailConfirmation", "someone.else@tremolo.test");
		await submitForm(1);

		expect(messages()).toEqual(["Email does not match your account email"]);
		expect(store.isAuthenticated()).toBe(true);
		expect(navigate).not.toHaveBeenCalled();
	});

	it("signs the user out and lands on / when the email matches", async () => {
		await render();
		await click("Delete My Account");
		await type("emailConfirmation", EMAIL);
		await submitForm(1);

		expect(messages()).toEqual(["Account deletion would occur here"]);
		expect(store.isAuthenticated()).toBe(false);
		expect(store.user()).toBeNull();
		expect(navigate).toHaveBeenCalledWith("/");
	});

	it("makes no request -- nothing on this page has a backend route yet", async () => {
		await render();
		await click("Download All My Data");
		await type("currentPassword", "Old-Passw0rd!");
		await type("newPassword", "New-Passw0rd!");
		await type("confirmPassword", "New-Passw0rd!");
		await submitForm(0);

		backend.expectNone(() => true);
	});
});
