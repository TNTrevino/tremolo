import { TestBed } from "@angular/core/testing";
import { provideRouter, Router, UrlTree } from "@angular/router";

import { signIn, snapshots } from "../../../../testing/auth-fixtures";
import { AuthStore } from "../auth.store";
import { authGuard } from "./auth.guard";

/** Was frontend-react/src/shared/components/layout/ProtectedRoute.test.tsx. */
describe("authGuard", () => {
	let store: AuthStore;
	let router: Router;

	beforeEach(() => {
		localStorage.clear();
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
		store = TestBed.inject(AuthStore);
		router = TestBed.inject(Router);
	});

	function run(url = "/dashboard"): boolean | UrlTree {
		const { route, state } = snapshots(url);
		return TestBed.runInInjectionContext(
			() => authGuard(route, state) as boolean | UrlTree,
		);
	}

	it("lets a signed-in user through", () => {
		signIn(store, "STUDENT");

		expect(run()).toBe(true);
	});

	it("sends a signed-out visitor to /login", () => {
		const result = run();

		expect(result).toBeInstanceOf(UrlTree);
		expect(router.serializeUrl(result as UrlTree)).toBe("/login");
	});

	it("remembers where the visitor was headed", () => {
		run("/assignments/7/play");

		expect(store.redirectUrl()).toBe("/assignments/7/play");
	});
});
