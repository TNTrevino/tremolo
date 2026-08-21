import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideIcons } from "@ng-icons/core";

import { environment } from "../../../../../environments/environment";
import { TREMOLO_ICONS } from "../../../../core/icons";
import { NotificationService } from "../../../../core/services/notification.service";
import type { FriendResponse } from "../../models/friends.models";
import { AddFriendViewComponent } from "./add-friend-view.component";

const FRIENDS_URL = `${environment.mainApi}/api/friends`;
const SEARCH_URL = `${FRIENDS_URL}/search`;

/** Longer than the component's 120ms debounce. */
const PAST_DEBOUNCE_MS = 200;

const AMIGA: FriendResponse = {
	id: 12,
	first_name: "Amiga",
	last_name: "Vega",
	role: "STUDENT",
	instrument: "Cello",
	avatar_url: "https://example.test/a.png",
	school: "Rosewood High",
};

/**
 * The add view's contract as `e2e/specs/friends-and-theme.spec.ts` sees it:
 * an "Add Friend" heading, a "Back to friends" button, a "Search by
 * name..." placeholder, and a per-result button named `Add <full name>`
 * that flips to `<full name> added`.
 */
describe("AddFriendViewComponent", () => {
	let fixture: ComponentFixture<AddFriendViewComponent>;
	let backend: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideIcons(TREMOLO_ICONS),
			],
		});
		backend = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		backend.verify();
		vi.restoreAllMocks();
	});

	async function render(): Promise<void> {
		fixture = TestBed.createComponent(AddFriendViewComponent);
		await fixture.whenStable();
	}

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function button(name: string): HTMLButtonElement | null {
		return el().querySelector(`button[aria-label="${name}"]`);
	}

	/**
	 * Types into the box and waits out the debounce, then runs change
	 * detection rather than awaiting `whenStable()`: once the search resource
	 * is in flight it holds a pending task that `HttpTestingController` will
	 * not release until the caller flushes.
	 */
	async function search(text: string): Promise<void> {
		const box = el().querySelector("input") as HTMLInputElement;
		box.value = text;
		box.dispatchEvent(new Event("input"));
		await new Promise((resolve) => setTimeout(resolve, PAST_DEBOUNCE_MS));
		fixture.detectChanges();
	}

	it("renders the heading, the back button and the search box", async () => {
		await render();

		expect(el().querySelector("h2")?.textContent?.trim()).toBe("Add Friend");
		expect(button("Back to friends")).not.toBeNull();
		expect(el().querySelector("input")?.getAttribute("placeholder")).toBe(
			"Search by name...",
		);
	});

	it("prompts before anything is typed and issues no request", async () => {
		await render();

		expect(el().textContent).toContain("Search for someone by name");
		backend.verify();
	});

	it("does not search for a blank or whitespace-only query", async () => {
		await render();
		await search("   ");

		expect(el().textContent).toContain("Search for someone by name");
		backend.verify();
	});

	it("searches once the debounce settles and lists the results", async () => {
		await render();
		await search("Amiga");

		const request = backend.expectOne((req) => req.url === SEARCH_URL);
		expect(request.request.params.get("q")).toBe("Amiga");
		request.flush([AMIGA]);
		await fixture.whenStable();

		expect(el().textContent).toContain("Amiga Vega");
		expect(button("Add Amiga Vega")).not.toBeNull();
	});

	it("collapses a burst of keystrokes into one request", async () => {
		await render();

		const box = el().querySelector("input") as HTMLInputElement;
		for (const text of ["A", "Am", "Ami"]) {
			box.value = text;
			box.dispatchEvent(new Event("input"));
		}
		await new Promise((resolve) => setTimeout(resolve, PAST_DEBOUNCE_MS));
		fixture.detectChanges();

		const request = backend.expectOne((req) => req.url === SEARCH_URL);
		expect(request.request.params.get("q")).toBe("Ami");
		request.flush([]);
		await fixture.whenStable();

		expect(el().textContent).toContain("No users found");
	});

	it("posts the add and flips the button in place", async () => {
		await render();
		await search("Amiga");
		backend.expectOne((req) => req.url === SEARCH_URL).flush([AMIGA]);
		await fixture.whenStable();

		button("Add Amiga Vega")!.click();
		fixture.detectChanges();

		const add = backend.expectOne({ method: "POST", url: FRIENDS_URL });
		expect(add.request.body).toEqual({ friend_id: 12 });
		add.flush(null);
		await fixture.whenStable();

		expect(button("Add Amiga Vega")).toBeNull();
		const added = button("Amiga Vega added");
		expect(added).not.toBeNull();
		expect(added!.disabled).toBe(true);
	});

	it("toasts a failed add and leaves the button addable", async () => {
		const showError = vi.spyOn(
			TestBed.inject(NotificationService),
			"showError",
		);
		await render();
		await search("Amiga");
		backend.expectOne((req) => req.url === SEARCH_URL).flush([AMIGA]);
		await fixture.whenStable();

		button("Add Amiga Vega")!.click();
		fixture.detectChanges();
		backend
			.expectOne({ method: "POST", url: FRIENDS_URL })
			.flush(
				{ error: "already friends" },
				{ status: 409, statusText: "Conflict" },
			);
		await fixture.whenStable();

		expect(showError).toHaveBeenCalledWith(
			"already friends",
			"Failed to add friend",
		);
		expect(button("Add Amiga Vega")?.disabled).toBe(false);
	});

	it("shows a search failure inline and does not toast it", async () => {
		const showError = vi.spyOn(
			TestBed.inject(NotificationService),
			"showError",
		);
		await render();
		await search("Amiga");

		backend
			.expectOne((req) => req.url === SEARCH_URL)
			.flush({ error: "down" }, { status: 500, statusText: "Server Error" });
		await fixture.whenStable();

		expect(el().textContent).toContain(
			"Search failed. Check your connection and try again.",
		);
		expect(showError).not.toHaveBeenCalled();
	});

	it("emits back from the back button", async () => {
		await render();

		let backed = false;
		fixture.componentInstance.back.subscribe(() => (backed = true));
		button("Back to friends")!.click();
		await fixture.whenStable();

		expect(backed).toBe(true);
	});
});
