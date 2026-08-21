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

const FRIENDS_URL = `${environment.mainApi}/api/friends`;

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
