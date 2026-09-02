import { inject } from "@angular/core";
import { type CanActivateFn, Router } from "@angular/router";

import { AuthStore } from "../auth.store";

/**
 * Port of frontend-react's `ProtectedRoute`: signed out visitors go to
 * /login, everyone else passes.
 *
 * React carried the attempted location in router state
 * (`<Navigate state={{ from: location }} />`). A query parameter would do the
 * same job here, but it would also change the URL the user lands on, and the
 * parity suite asserts a bare `/login`. The attempted URL rides on the store
 * instead, for the login page to read after a successful sign in.
 */
export const authGuard: CanActivateFn = (_route, state) => {
	const store = inject(AuthStore);
	const router = inject(Router);

	if (store.isAuthenticated()) return true;

	store.redirectUrl.set(state.url);
	return router.createUrlTree(["/login"]);
};
