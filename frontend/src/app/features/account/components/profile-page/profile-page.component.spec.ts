import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideIcons } from "@ng-icons/core";

import { AuthStore } from "../../../../auth/services/auth.store";
import { TREMOLO_ICONS } from "../../../../core/icons";
import { ProfilePageComponent } from "./profile-page.component";

/**
 * The profile page renders the session and nothing else -- no request is
 * made, which is why there is no `HttpTestingController` here and no
 * `rxResource` in the component.
 */
describe("ProfilePageComponent", () => {
	let fixture: ComponentFixture<ProfilePageComponent>;
	let store: AuthStore;

	beforeEach(() => {
		localStorage.clear();
		TestBed.configureTestingModule({
			providers: [provideRouter([]), provideIcons(TREMOLO_ICONS)],
		});
		store = TestBed.inject(AuthStore);
	});

	async function render(): Promise<void> {
		fixture = TestBed.createComponent(ProfilePageComponent);
		await fixture.whenStable();
	}

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function signIn(): void {
		store.setUser({
			id: 42,
			email: "baseline.student@tremolo.test",
			firstName: "Baseline",
			lastName: "Student",
			role: "STUDENT",
		});
	}

	it("renders the heading and subtitle", async () => {
		signIn();
		await render();

		expect(el().querySelector("h1")?.textContent?.trim()).toBe("Profile");
		expect(el().textContent).toContain(
			"View and manage your personal information and preferences",
		);
	});

	it("shows the signed-in user's name, email, initials and role", async () => {
		signIn();
		await render();

		expect(el().querySelector("h2")?.textContent?.trim()).toBe(
			"Baseline Student",
		);
		expect(el().textContent).toContain("baseline.student@tremolo.test");
		// "STUDENT" is title-cased for display, as React's inline expression did.
		expect(el().textContent).toContain("Student");
		expect(el().textContent).toContain("BS");
	});

	it("renders all six proposed-feature cards, in order", async () => {
		signIn();
		await render();

		const titles = [...el().querySelectorAll("h3")].map((h) =>
			h.textContent?.trim(),
		);
		expect(titles).toEqual([
			"Personal Information",
			"Practice Preferences",
			"Practice Goals",
			"Achievements & Badges",
			"Detailed Statistics",
			"Connections",
			"Coming Soon",
		]);
	});

	it("lists each card's bullet points", async () => {
		signIn();
		await render();

		const items = [...el().querySelectorAll("li")].map((li) =>
			li.textContent?.trim(),
		);
		expect(items).toHaveLength(30);
		expect(items).toContain("• Edit name and avatar");
		expect(items).toContain("• Collaborate on goals");
	});

	/** React's `if (!user) return null`. The guard makes it unreachable; it is still the contract. */
	it("renders nothing when there is no session", async () => {
		await render();

		expect(el().textContent?.trim()).toBe("");
	});
});
