import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideIcons } from "@ng-icons/core";

import { environment } from "../../../../../environments/environment";
import { TREMOLO_ICONS } from "../../../../core/icons";
import { FriendsUiStore } from "../../services/friends.store";
import { FriendsPanelComponent } from "./friends-panel.component";

const FRIENDS_URL = `${environment.mainApi}/api/friends`;

/**
 * The panel is the piece of chrome the parity suite exists to catch in the
 * wrong place, so what is pinned here is the shell behaviour: the aside is
 * always mounted and slides on a transform, the scrim is conditional, and
 * swapping to the add view and back **re-creates** the list -- which is how
 * a just-added friend appears without a cache to invalidate (D6).
 */
describe("FriendsPanelComponent", () => {
	let fixture: ComponentFixture<FriendsPanelComponent>;
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
	 * Flush before settling: the list's `rxResource` holds a pending task
	 * while `HttpTestingController` holds its response, so `whenStable()`
	 * would time out if it were awaited first.
	 */
	async function render(): Promise<void> {
		fixture = TestBed.createComponent(FriendsPanelComponent);
		fixture.detectChanges();
		backend.expectOne(FRIENDS_URL).flush([]);
		await fixture.whenStable();
	}

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function aside(): HTMLElement {
		return el().querySelector("aside") as HTMLElement;
	}

	function button(name: string): HTMLButtonElement {
		return el().querySelector(
			`button[aria-label="${name}"]`,
		) as HTMLButtonElement;
	}

	it("keeps the aside mounted and slides it with a transform", async () => {
		await render();

		expect(aside().className).toContain("translate-x-full");

		ui.togglePanel();
		await fixture.whenStable();

		expect(aside().className).toContain("translate-x-0");
		expect(aside().className).not.toContain("translate-x-full");
	});

	it("renders the mobile scrim only while the panel is open", async () => {
		await render();

		const scrim = () =>
			el().querySelector('[aria-label="Close friends panel"]');
		expect(scrim()).toBeNull();

		ui.togglePanel();
		await fixture.whenStable();
		expect(scrim()).not.toBeNull();
	});

	it("closes the panel when the scrim is clicked", async () => {
		await render();
		ui.togglePanel();
		await fixture.whenStable();

		(
			el().querySelector('[aria-label="Close friends panel"]') as HTMLElement
		).click();
		await fixture.whenStable();

		expect(ui.isPanelOpen()).toBe(false);
	});

	it("closes the panel from the list's own close button", async () => {
		await render();
		ui.togglePanel();
		await fixture.whenStable();

		button("Close friends").click();
		await fixture.whenStable();

		expect(ui.isPanelOpen()).toBe(false);
	});

	it("swaps to the add view and back, refetching the list on return", async () => {
		await render();

		button("Add friend").click();
		await fixture.whenStable();
		expect(el().querySelector("h2")?.textContent?.trim()).toBe("Add Friend");

		button("Back to friends").click();
		fixture.detectChanges();
		expect(el().querySelector("h2")?.textContent?.trim()).toBe("Friends");

		// The re-created list fetched again -- no cache, no invalidation (D6).
		backend.expectOne(FRIENDS_URL).flush([
			{
				id: 12,
				first_name: "Amiga",
				last_name: "Vega",
				role: "STUDENT",
				instrument: "Cello",
				avatar_url: "https://example.test/a.png",
				school: "Rosewood High",
			},
		]);
		await fixture.whenStable();

		expect(el().textContent).toContain("Amiga Vega");
	});
});
