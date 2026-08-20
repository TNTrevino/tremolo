import type {
	ActivatedRouteSnapshot,
	RouterStateSnapshot,
} from "@angular/router";

import type { UserRole } from "../app/auth/models/auth.models";
import type { AuthStore } from "../app/auth/services/auth.store";

/**
 * Shared test fixtures. `src/testing/` is compiled by tsconfig.spec.json and
 * excluded from tsconfig.app.json, so nothing in here can reach a build.
 */

/**
 * The guards read one thing off these snapshots -- `state.url` -- and
 * nothing off the route, so the stubs stay this thin on purpose.
 */
export function snapshots(url: string): {
	route: ActivatedRouteSnapshot;
	state: RouterStateSnapshot;
} {
	return {
		route: {} as ActivatedRouteSnapshot,
		state: { url } as RouterStateSnapshot,
	};
}

/** Puts a signed-in user of the given role into the store. */
export function signIn(store: AuthStore, role: UserRole): void {
	store.setAuthFromLogin({
		user: {
			id: 1,
			email: "user@tremolo.test",
			first_name: "Test",
			last_name: "User",
			role,
		},
		access_token: "access-token",
		refresh_token: "refresh-token",
	});
}
