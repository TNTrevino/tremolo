import { inject, InjectionToken, isDevMode } from "@angular/core";
import type { CanMatchFn } from "@angular/router";

/**
 * Whether this is a dev build, behind an injectable token rather than a
 * bare `isDevMode()` call inside the guard.
 *
 * `ng build` defaults to the production configuration, which compiles
 * `isDevMode()` to always return `false` (`ngDevMode` is compiled out);
 * `ng serve` and the unit tests stay dev. The token exists so a spec can
 * assert the production branch of `devOnlyGuard` by overriding it --
 * `{ provide: DEV_MODE, useValue: false }` -- rather than needing to fake
 * an actual production build inside the test runner.
 */
export const DEV_MODE = new InjectionToken<boolean>("DEV_MODE", {
	providedIn: "root",
	factory: () => isDevMode(),
});

/**
 * Keeps a dev-only route (currently just /dev/kit) out of production.
 *
 * `canMatch`, not `canActivate`: when it returns `false` the router treats
 * the route as though it were never declared and falls through to the next
 * match -- here, the `**` wildcard, i.e. the 404 page -- rather than
 * blocking navigation the way a failed `canActivate` would. `canMatch` also
 * runs before the route's lazy chunk is fetched, so a production visitor
 * never downloads the OSMD-heavy kit bundle just to be turned away from it.
 */
export const devOnlyGuard: CanMatchFn = () => inject(DEV_MODE);
