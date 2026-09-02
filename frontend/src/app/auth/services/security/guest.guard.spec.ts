import { TestBed } from "@angular/core/testing";
import { provideRouter, Router, UrlTree } from "@angular/router";

import { signIn, snapshots } from "../../../../testing/auth-fixtures";
import { AuthStore } from "../auth.store";
import { guestGuard } from "./guest.guard";

/** Was frontend-react/src/shared/components/layout/GuestRoute.test.tsx. */
describe("guestGuard", () => {
	let store: AuthStore;
	let router: Router;

	beforeEach(() => {
		localStorage.clear();
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
		store = TestBed.inject(AuthStore);
		router = TestBed.inject(Router);
	});

	function run(): boolean | UrlTree {
		const { route, state } = snapshots("/login");
		return TestBed.runInInjectionContext(
			() => guestGuard(route, state) as boolean | UrlTree,
		);
	}

	it("lets a signed-out visitor see the form", () => {
		expect(run()).toBe(true);
	});

	it("sends a signed-in user to /dashboard", () => {
		signIn(store, "STUDENT");

		const result = run();

		expect(result).toBeInstanceOf(UrlTree);
		expect(router.serializeUrl(result as UrlTree)).toBe("/dashboard");
	});
});
