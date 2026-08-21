import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideIcons } from "@ng-icons/core";

import { environment } from "../../../../../environments/environment";
import { TREMOLO_ICONS } from "../../../../core/icons";
import { ClassesPageComponent } from "./classes-page.component";

const CLASSES_URL = `${environment.mainApi}/api/classes`;

const SAMPLE = [
	{
		id: 1,
		name: "Symphonic Band",
		join_code: "7NZJN3",
		student_count: 12,
		created_at: "2026-07-12T04:00:00Z",
	},
	{
		id: 2,
		name: "Jazz Ensemble",
		join_code: "AB12CD",
		student_count: 4,
		created_at: "2026-07-11T04:00:00Z",
	},
];

/**
 * Port of
 * frontend-react/src/features/classes/components/MyClassesView.test.tsx --
 * React tested the view, Angular has only the page, so its four states are
 * driven through the real `rxResource` instead of a mocked hook.
 *
 * The three names asserted here are the ones `e2e/specs/classes.spec.ts`
 * selects on: the "My Classes" heading, the "New class" button, and the
 * "Copy join code" button on each card.
 */
describe("ClassesPageComponent", () => {
	let fixture: ComponentFixture<ClassesPageComponent>;
	let backend: HttpTestingController;

	// `detectChanges()`, not `await whenStable()`: the page's `rxResource`
	// fires on first render and `whenStable()` waits for every pending task,
	// so awaiting it before the request has been flushed hangs the hook.
	// Every spec for a resource-backed component in this feature is shaped
	// this way -- render, assert the loading state, flush, then await.
	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				provideIcons(TREMOLO_ICONS),
			],
		});
		backend = TestBed.inject(HttpTestingController);
		fixture = TestBed.createComponent(ClassesPageComponent);
		fixture.detectChanges();
	});

	afterEach(() => {
		backend.verify();
		vi.restoreAllMocks();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function button(name: string): HTMLButtonElement | undefined {
		return [...el().querySelectorAll("button")].find(
			(b) =>
				b.textContent?.trim() === name || b.getAttribute("aria-label") === name,
		);
	}

	async function load(body: object): Promise<void> {
		backend.expectOne(CLASSES_URL).flush(body);
		await fixture.whenStable();
	}

	it("shows the heading and CTA while still fetching", async () => {
		expect(el().querySelector("h1")?.textContent?.trim()).toBe("My Classes");
		expect(button("New class")).toBeTruthy();
		expect(el().textContent).not.toContain("No classes yet");

		await load([]);
	});

	it("shows the server's error message", async () => {
		backend
			.expectOne(CLASSES_URL)
			.flush({ error: "Network error" }, { status: 500, statusText: "Error" });
		await fixture.whenStable();

		expect(el().textContent).toContain("Network error");
	});

	it("shows the empty state when there are no classes", async () => {
		await load([]);

		expect(el().textContent).toContain(
			"No classes yet — create one to get started.",
		);
	});

	it("renders a card per class with its join code and student count", async () => {
		await load(SAMPLE);

		expect(el().textContent).toContain("Symphonic Band");
		expect(el().textContent).toContain("7NZJN3");
		expect(el().textContent).toContain("12");
		expect(el().textContent).toContain("Jazz Ensemble");
		expect(el().textContent).toContain("AB12CD");
		expect(
			[...el().querySelectorAll('[aria-label="Copy join code"]')].length,
		).toBe(2);
	});

	it("links each card at its class detail route", async () => {
		await load(SAMPLE);
		const hrefs = [...el().querySelectorAll("a")].map((a) =>
			a.getAttribute("href"),
		);

		expect(hrefs).toEqual(["/classes/1", "/classes/2"]);
	});

	it("opens the create-class dialog from the New class CTA", async () => {
		await load([]);

		button("New class")?.click();
		await fixture.whenStable();

		const dialog = el().querySelector('[role="dialog"]');
		expect(dialog).toBeTruthy();
		expect(dialog?.textContent).toContain("New class");
		expect(el().querySelector("#class-name")).toBeTruthy();
	});

	it("blocks an empty class name and posts a valid one, then refetches", async () => {
		await load([]);
		button("New class")?.click();
		await fixture.whenStable();

		const form = el().querySelector("form") as HTMLFormElement;
		form.dispatchEvent(new Event("submit", { cancelable: true }));
		await fixture.whenStable();

		backend.expectNone({ method: "POST", url: CLASSES_URL });
		expect(el().textContent).toContain("Class name is required");

		const input = el().querySelector("#class-name") as HTMLInputElement;
		input.value = "Symphonic Band";
		input.dispatchEvent(new Event("input"));
		await fixture.whenStable();

		form.dispatchEvent(new Event("submit", { cancelable: true }));
		await fixture.whenStable();

		const post = backend.expectOne(
			(r) => r.method === "POST" && r.url === CLASSES_URL,
		);
		expect(post.request.body).toEqual({ name: "Symphonic Band" });
		// Success closes the dialog and reloads the list -- the port of
		// `invalidateQueries(teacherList())` -- so the refetch is already in
		// flight and `whenStable()` would wait for it.
		post.flush(SAMPLE[0] as object);
		fixture.detectChanges();

		expect(el().querySelector('[role="dialog"]')).toBeNull();
		await load(SAMPLE);
		expect(el().textContent).toContain("7NZJN3");
	});
});
