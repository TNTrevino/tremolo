import { TestBed } from "@angular/core/testing";
import { provideRouter, Router, UrlTree } from "@angular/router";

import { signIn, snapshots } from "../../../../testing/auth-fixtures";
import { AuthStore } from "../auth.store";
import { teacherGuard } from "./teacher.guard";

/**
 * TeacherRoute had no test in the React app; this is new coverage for the
 * behaviour its comment describes.
 */
describe("teacherGuard", () => {
	let store: AuthStore;
	let router: Router;

	beforeEach(() => {
		localStorage.clear();
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
		store = TestBed.inject(AuthStore);
		router = TestBed.inject(Router);
	});

	function run(url = "/classes"): boolean | UrlTree {
		const { route, state } = snapshots(url);
		return TestBed.runInInjectionContext(
			() => teacherGuard(route, state) as boolean | UrlTree,
		);
	}

	it("lets a teacher through", () => {
		signIn(store, "TEACHER");

		expect(run()).toBe(true);
	});

	it("sends a signed-in non-teacher to /dashboard", () => {
		signIn(store, "STUDENT");

		expect(router.serializeUrl(run() as UrlTree)).toBe("/dashboard");
	});

	it("sends an anonymous visitor to /login, not to /dashboard", () => {
		expect(router.serializeUrl(run() as UrlTree)).toBe("/login");
	});
});
