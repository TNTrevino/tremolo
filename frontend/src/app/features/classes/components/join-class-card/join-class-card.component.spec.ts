import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideIcons } from "@ng-icons/core";

import { environment } from "../../../../../environments/environment";
import { TREMOLO_ICONS } from "../../../../core/icons";
import { NotificationService } from "../../../../core/services/notification.service";
import { JoinClassCardComponent } from "./join-class-card.component";

const JOINED_URL = `${environment.mainApi}/api/classes/joined`;
const JOIN_URL = `${environment.mainApi}/api/classes/join`;

/**
 * Port of
 * frontend-react/src/features/classes/components/JoinClassCard.test.tsx.
 *
 * The load-bearing case is the third one: a wrong code must appear **next
 * to the field**, not as a toast. React said so with
 * `meta: { suppressErrorToast: true }`; here it is asserted by watching the
 * `NotificationService` stay silent.
 */
describe("JoinClassCardComponent", () => {
	let fixture: ComponentFixture<JoinClassCardComponent>;
	let backend: HttpTestingController;
	let notifications: NotificationService;

	// See the note in `classes-page.component.spec.ts`: render with
	// `detectChanges()` and only `await whenStable()` once the resource's
	// request has been flushed.
	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideIcons(TREMOLO_ICONS),
			],
		});
		backend = TestBed.inject(HttpTestingController);
		notifications = TestBed.inject(NotificationService);
		fixture = TestBed.createComponent(JoinClassCardComponent);
		fixture.detectChanges();
	});

	afterEach(() => {
		backend.verify();
		vi.restoreAllMocks();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	async function loadClasses(body: object): Promise<void> {
		backend.expectOne(JOINED_URL).flush(body);
		await fixture.whenStable();
	}

	async function typeCode(value: string): Promise<void> {
		const input = el().querySelector("#join-code") as HTMLInputElement;
		input.value = value;
		input.dispatchEvent(new Event("input"));
		await fixture.whenStable();
	}

	async function submit(): Promise<void> {
		(el().querySelector("form") as HTMLFormElement).dispatchEvent(
			new Event("submit", { cancelable: true }),
		);
		await fixture.whenStable();
	}

	it("labels the code field and names the button 'Join' exactly", async () => {
		await loadClasses([]);
		const label = el().querySelector(
			'label[for="join-code"]',
		) as HTMLLabelElement;
		const join = [...el().querySelectorAll("button")].find(
			(b) => b.textContent?.trim() === "Join",
		);

		// `exact: true` in the parity suite -- "Join a class" is the card title,
		// not a button, and the button must not read "Join class".
		expect(label.textContent?.trim()).toBe("Class code");
		expect(join).toBeTruthy();
	});

	it("blocks an empty code and shows the schema's message", async () => {
		await loadClasses([]);

		await submit();

		backend.expectNone(JOIN_URL);
		expect(el().textContent).toContain("Enter a class code");
	});

	it("caps the code at six characters, as React's maxLength did", async () => {
		await loadClasses([]);
		const input = el().querySelector("#join-code") as HTMLInputElement;

		// The cap moved from a hand-written attribute into the form schema --
		// Signal Forms owns validation attributes on a bound control (NG8022)
		// -- and the directive renders it back onto the element, so a real
		// browser still refuses the seventh character exactly as React's
		// `maxLength={6}` did.
		expect(input.getAttribute("maxlength")).toBe("6");
	});

	it("submits the code and confirms the class it joined", async () => {
		await loadClasses([]);
		await typeCode("7NZJN3");

		await submit();
		const post = backend.expectOne(JOIN_URL);
		expect(post.request.body).toEqual({ join_code: "7NZJN3" });
		// A successful join immediately reloads the class list (D6 -- there is
		// no cache to invalidate), so render rather than awaiting stability
		// while that second request is in flight.
		post.flush({
			id: 1,
			name: "Symphonic Band",
			teacher_name: "Terry Director",
		});
		fixture.detectChanges();

		expect(el().textContent).toContain("Symphonic Band");
		expect(el().textContent).toContain("Terry Director");

		await loadClasses([
			{ id: 1, name: "Symphonic Band", teacher_name: "Terry Director" },
		]);
		expect(el().querySelectorAll("li").length).toBe(1);
	});

	it("shows the backend's 404 message inline, not as a toast", async () => {
		await loadClasses([]);
		await typeCode("BADCOD");

		await submit();
		backend
			.expectOne(JOIN_URL)
			.flush(
				{ error: "No class with that join code" },
				{ status: 404, statusText: "Not Found" },
			);
		await fixture.whenStable();

		expect(el().textContent).toContain("No class with that join code");
		expect(notifications.toasts()).toEqual([]);
	});

	it("lists the student's joined classes without any join code", async () => {
		await loadClasses([
			{ id: 1, name: "Symphonic Band", teacher_name: "Terry Director" },
		]);

		expect(el().textContent).toContain("Symphonic Band");
		expect(el().textContent).toContain("Terry Director");
		expect(el().textContent).not.toContain("Join code");
	});

	it("shows an empty state when the student has no classes", async () => {
		await loadClasses([]);

		expect(el().textContent).toContain("You haven't joined any classes yet.");
	});

	it("says so when the class list fails to load", async () => {
		backend
			.expectOne(JOINED_URL)
			.flush(null, { status: 500, statusText: "Error" });
		await fixture.whenStable();

		expect(el().textContent).toContain("Failed to load your classes.");
	});
});
