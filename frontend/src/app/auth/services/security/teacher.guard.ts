import { inject } from "@angular/core";
import { type CanActivateFn, Router } from "@angular/router";

import { AuthStore } from "../auth.store";
import { authGuard } from "./auth.guard";

/**
 * Port of frontend-react's `TeacherRoute`, which wrapped `ProtectedRoute`.
 *
 * The order matters and is copied from the original comment there: the role
 * is only checked once the visitor is signed in. An anonymous visitor falls
 * through to `authGuard` and goes to /login, not to /dashboard.
 */
export const teacherGuard: CanActivateFn = (route, state) => {
	const store = inject(AuthStore);
	const router = inject(Router);

	if (store.isAuthenticated() && store.role() !== "TEACHER") {
		return router.createUrlTree(["/dashboard"]);
	}

	return authGuard(route, state);
};
