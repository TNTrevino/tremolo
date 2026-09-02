import { inject } from "@angular/core";
import { type CanActivateFn, Router } from "@angular/router";

import { AuthStore } from "../auth.store";

/**
 * Port of frontend-react's `GuestRoute`: a signed in user cannot go back to
 * the login or signup forms; they are sent to the dashboard.
 */
export const guestGuard: CanActivateFn = () => {
	const store = inject(AuthStore);
	const router = inject(Router);

	return store.isAuthenticated() ? router.createUrlTree(["/dashboard"]) : true;
};
