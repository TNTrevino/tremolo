import { provideHttpClient } from "@angular/common/http";
import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
	provideRouter,
	type Route,
	Router,
	RouterOutlet,
	type Routes,
	withRouterConfig,
} from "@angular/router";
import { provideIcons } from "@ng-icons/core";

import { signIn } from "../testing/auth-fixtures";
import { ROUTER_CONFIG } from "./app.config";
import { routes } from "./app.routes";
import { authGuard } from "./auth/services/security/auth.guard";
import { teacherGuard } from "./auth/services/security/teacher.guard";
import { AuthStore } from "./auth/services/auth.store";
import { NavigationComponent } from "./core/components/navigation/navigation.component";
import { TREMOLO_ICONS } from "./core/icons";

/**
 * The logout bounce, end to end through the real route table.
 *
 * React's `ProtectedRoute` re-rendered on every auth-store change, so logging
 * out on a guarded page sent the visitor to /login while logging out on a
 * public page left them alone. Angular reproduces that with three pieces --
 * `NavigationComponent.logout()` re-navigating the current URL,
 * `onSameUrlNavigation: "reload"` (ROUTER_CONFIG) letting that same-URL
 * navigation be processed, and `runGuardsAndResolvers: "always"` on the
 * guarded routes re-running `canActivate` once it is. Drop any one of them and
 * the URL stays on the guarded page with a signed-out visitor still reading
 * it, which is exactly what the Phase 2 verifier found (finding F1).
 *
 * So this spec uses the **real** `routes` and the **real** `ROUTER_CONFIG`,
 * with only the lazy page components swapped for a blank one -- the pages
 * themselves are placeholders and none of them is under test here.
 */

@Component({ selector: "app-blank-page", template: "" })
class BlankPageComponent {}

@Component({
	selector: "app-test-shell",
	imports: [NavigationComponent, RouterOutlet],
	template: "<app-navigation /><router-outlet />",
})
class TestShellComponent {}

/** The real route table, minus the lazy loads. Guards and route flags stay. */
function withStubbedPages(config: Routes): Routes {
	return config.map((route: Route): Route => {
		if (!route.loadComponent) return route;
		const stubbed: Route = { ...route, component: BlankPageComponent };
		delete stubbed.loadComponent;
		return stubbed;
	});
}

describe("logout and the route table", () => {
	let fixture: ComponentFixture<TestShellComponent>;
	let router: Router;
	let store: AuthStore;

	beforeEach(async () => {
		localStorage.clear();
		TestBed.configureTestingModule({
			providers: [
				provideRouter(
					withStubbedPages(routes),
					withRouterConfig(ROUTER_CONFIG),
				),
				provideHttpClient(),
				provideIcons(TREMOLO_ICONS),
			],
		});
		router = TestBed.inject(Router);
		store = TestBed.inject(AuthStore);
		fixture = TestBed.createComponent(TestShellComponent);
		await fixture.whenStable();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	/** Opens the account menu and presses Log Out, as a user would. */
	async function pressLogOut(): Promise<void> {
		const account = el().querySelector<HTMLElement>(
			'[aria-label="Account menu"]',
		);
		expect(account).not.toBeNull();
		account?.click();
		await fixture.whenStable();

		const logOut = [...el().querySelectorAll("button")].find((button) =>
			/log out/i.test(button.textContent ?? ""),
		);
		expect(logOut).toBeDefined();
		logOut?.click();
		await fixture.whenStable();
	}

	async function signedInOn(
		url: string,
		role: "STUDENT" | "TEACHER" = "STUDENT",
	): Promise<void> {
		signIn(store, role);
		await router.navigateByUrl(url);
		await fixture.whenStable();
		expect(router.url).toBe(url);
	}

	it("bounces to /login when the visitor logs out on a guarded page", async () => {
		await signedInOn("/dashboard");

		await pressLogOut();

		expect(store.isAuthenticated()).toBe(false);
		expect(router.url).toBe("/login");
	});

	it("bounces to /login from a teacher-only page too", async () => {
		await signedInOn("/classes", "TEACHER");

		await pressLogOut();

		expect(router.url).toBe("/login");
	});

	it("remembers the guarded page the logout left, as any redirect does", async () => {
		await signedInOn("/assignments");

		await pressLogOut();

		expect(store.redirectUrl()).toBe("/assignments");
	});

	it("leaves the visitor on a public page", async () => {
		await signedInOn("/about");

		await pressLogOut();

		expect(store.isAuthenticated()).toBe(false);
		expect(router.url).toBe("/about");
	});

	it("gives every signed-in-only route the flag the bounce depends on", () => {
		const guarded = routes.filter((route) =>
			route.canActivate?.some(
				(guard) => guard === authGuard || guard === teacherGuard,
			),
		);

		expect(guarded).toHaveLength(8);
		for (const route of guarded) {
			expect(`${route.path}: ${route.runGuardsAndResolvers}`).toBe(
				`${route.path}: always`,
			);
		}
	});
});

describe("legal pages", () => {
	it("leaves the legal pages unguarded", () => {
		for (const path of ["privacy", "terms"]) {
			const route = routes.find((r) => r.path === path);
			expect(route).toBeDefined();
			expect(route?.canActivate).toBeUndefined();
		}
	});
});
