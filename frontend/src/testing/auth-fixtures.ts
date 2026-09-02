import type {
	ActivatedRouteSnapshot,
	RouterStateSnapshot,
} from "@angular/router";

import type { UserRole } from "../app/auth/models/auth.models";
import type { AuthStore } from "../app/auth/services/auth.store";

/**
 * Shared test fixtures. `src/testing/` is in tsconfig.spec.json's root file
 * set and out of tsconfig.app.json's.
 *
 * That split is a **convention, not a compile-time barrier** -- the Phase 1
 * verifier proved it by importing this file from `auth.store.ts` and
 * building clean. TypeScript's `exclude` only trims the root file set; a
 * file reached through an import is still compiled. Enforcing it would take
 * an ESLint `no-restricted-imports` rule, which `eslint.config.js` does not
 * have. Today only `.spec.ts` files import from here; keep it that way.
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

/**
 * Puts a signed-in user of the given role into the store. `emailVerified`
 * defaults to true -- #108's unverified-banner only appears for an
 * explicit `false`, and most specs signing in through this fixture have
 * no reason to care about verification state. `userId` defaults to 1 --
 * the shared-device specs that need a SECOND, distinct signed-in identity
 * (dismissal scoping, etc.) pass their own id explicitly.
 */
export function signIn(
	store: AuthStore,
	role: UserRole,
	emailVerified = true,
	userId = 1,
): void {
	store.setAuthFromLogin({
		user: {
			id: userId,
			email: "user@tremolo.test",
			first_name: "Test",
			last_name: "User",
			role,
			email_verified: emailVerified,
		},
		access_token: "access-token",
		refresh_token: "refresh-token",
	});
}
