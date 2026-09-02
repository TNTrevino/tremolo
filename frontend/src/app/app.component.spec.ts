import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideIcons } from "@ng-icons/core";

import { signIn } from "../testing/auth-fixtures";
import { environment } from "../environments/environment";
import { AppComponent } from "./app.component";
import { AuthStore } from "./auth/services/auth.store";
import { TREMOLO_ICONS } from "./core/icons";

const FRIENDS_URL = `${environment.coreApi}/api/friends`;

describe("AppComponent", () => {
	let fixture: ComponentFixture<AppComponent>;
	let backend: HttpTestingController;
	let store: AuthStore;

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
		backend = TestBed.inject(HttpTestingController);
		store = TestBed.inject(AuthStore);
		fixture = TestBed.createComponent(AppComponent);
		await fixture.whenStable();
	});

	afterEach(() => {
		backend.verify();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	it("hosts the router outlet", () => {
		expect(el().querySelector("router-outlet")).toBeTruthy();
	});

	/** The footer (#242) belongs on every route, not just whichever renders. */
	it("renders the footer on the shell", () => {
		expect(el().querySelector("app-footer")).not.toBeNull();
	});

	/**
	 * #108: the banner slot is unconditional in the template (its own
	 * `visible()` computed decides whether anything renders inside it), so
	 * it should always be in the tree, right after the nav bar -- unlike
	 * the friends panel below, which is only in the tree at all when signed
	 * in.
	 */
	it("hosts the verify-email banner slot right after the nav bar", () => {
		expect(el().querySelector("app-verify-email-banner")).toBeTruthy();
	});

	/**
	 * The panel hangs off the shell, not off a route -- that is what
	 * `e2e/specs/friends-and-theme.spec.ts` exists to catch -- and React
	 * rendered it as `{isAuthenticated && <FriendsPanel />}`.
	 */
	it("keeps the friends panel out of the tree for an anonymous visitor", () => {
		expect(el().querySelector("app-friends-panel")).toBeNull();
		// No component means no resource, so nothing fetched either.
		backend.verify();
	});

	it("mounts the friends panel once the user signs in", async () => {
		signIn(store, "STUDENT");
		// Not `whenStable()`: the panel's list resource is in flight the
		// moment it mounts, and its pending task only settles on the flush.
		fixture.detectChanges();

		expect(el().querySelector("app-friends-panel")).not.toBeNull();
		expect(el().querySelector("aside")).not.toBeNull();
		backend.expectOne(FRIENDS_URL).flush([]);
		await fixture.whenStable();
	});
});
