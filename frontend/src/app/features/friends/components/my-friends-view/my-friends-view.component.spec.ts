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
import { FriendsUiStore } from "../../services/friends.store";
import { MyFriendsViewComponent } from "./my-friends-view.component";

const FRIENDS_URL = `${environment.coreApi}/api/friends`;

function friend(overrides: Partial<FriendResponse> = {}): FriendResponse {
	return {
		id: 1,
		first_name: "Amiga",
		last_name: "Vega",
		role: "STUDENT",
		instrument: "Cello",
		avatar_url: "https://example.test/a.png",
		school: "Rosewood High",
		...overrides,
	};
}

/**
 * The friends list's contract as `e2e/specs/friends-and-theme.spec.ts` sees
 * it: a "Friends" heading, the "Looks lonely in here" empty state, and
 * buttons named "Add friend" and "Close friends".
 */
describe("MyFriendsViewComponent", () => {
	let fixture: ComponentFixture<MyFriendsViewComponent>;
	let backend: HttpTestingController;
	let ui: FriendsUiStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideIcons(TREMOLO_ICONS),
			],
		});
		backend = TestBed.inject(HttpTestingController);
		ui = TestBed.inject(FriendsUiStore);
	});

	afterEach(() => {
		backend.verify();
		vi.restoreAllMocks();
	});

	/**
	 * Creates the component and lets its resource fire, but does **not**
	 * await `whenStable()`: an `rxResource` registers a pending task while it
	 * loads, and with `HttpTestingController` holding the response that task
	 * never settles, so `whenStable()` would time out. Flush first, settle
	 * after.
	 */
	function create(): void {
		fixture = TestBed.createComponent(MyFriendsViewComponent);
		fixture.detectChanges();
	}

	async function render(rows: FriendResponse[] = []): Promise<void> {
		create();
		backend.expectOne(FRIENDS_URL).flush(rows);
		await fixture.whenStable();
	}

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function button(name: string): HTMLButtonElement {
		return el().querySelector(
			`button[aria-label="${name}"]`,
		) as HTMLButtonElement;
	}

	it("fetches the friends list on creation", async () => {
		create();

		backend.expectOne({ method: "GET", url: FRIENDS_URL }).flush([]);
		await fixture.whenStable();
	});

	it("renders the heading and the two named controls", async () => {
		await render();

		expect(el().querySelector("h2")?.textContent?.trim()).toBe("Friends");
		expect(button("Add friend")).not.toBeNull();
		expect(button("Close friends")).not.toBeNull();
	});

	it("shows the empty state when the user has no friends", async () => {
		await render([]);

		expect(el().textContent).toContain(
			"Looks lonely in here. Add some friends!",
		);
	});

	it("lists friends and counts them", async () => {
		await render([friend(), friend({ id: 2, first_name: "Bea" })]);

		expect(el().textContent).toContain("Amiga Vega");
		expect(el().textContent).toContain("Bea Vega");
		expect(el().querySelector("span.rounded-full")?.textContent?.trim()).toBe(
			"2",
		);
	});

	it("filters the fetched list client-side without another request", async () => {
		await render([friend(), friend({ id: 2, first_name: "Bea" })]);

		const search = el().querySelector("input") as HTMLInputElement;
		search.value = "bea";
		search.dispatchEvent(new Event("input"));
		await fixture.whenStable();

		expect(ui.searchQuery()).toBe("bea");
		expect(el().textContent).toContain("Bea Vega");
		expect(el().textContent).not.toContain("Amiga Vega");
		// The count badge stays on the whole list, as in React.
		expect(el().querySelector("span.rounded-full")?.textContent?.trim()).toBe(
			"2",
		);
		backend.verify();
	});

	it("says 'No friends found' when the filter matches nothing", async () => {
		await render([friend()]);

		const search = el().querySelector("input") as HTMLInputElement;
		search.value = "zzz";
		search.dispatchEvent(new Event("input"));
		await fixture.whenStable();

		expect(el().textContent).toContain("No friends found");
		expect(el().textContent).not.toContain("Looks lonely in here");
	});

	it("shows the failure inline and toasts it, as the query cache did", async () => {
		const showError = vi.spyOn(
			TestBed.inject(NotificationService),
			"showError",
		);
		create();

		backend
			.expectOne(FRIENDS_URL)
			.flush({ error: "nope" }, { status: 500, statusText: "Server Error" });
		await fixture.whenStable();

		expect(el().textContent).toContain("nope");
		expect(showError).toHaveBeenCalledWith("nope", "Failed to load friends");
	});

	it("emits addFriend and closed from its two buttons", async () => {
		await render();

		const seen: string[] = [];
		fixture.componentInstance.addFriend.subscribe(() => seen.push("add"));
		fixture.componentInstance.closed.subscribe(() => seen.push("close"));

		button("Add friend").click();
		button("Close friends").click();
		await fixture.whenStable();

		expect(seen).toEqual(["add", "close"]);
	});
});
