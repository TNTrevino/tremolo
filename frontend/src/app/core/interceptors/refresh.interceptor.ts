import {
	HttpErrorResponse,
	type HttpInterceptorFn,
} from "@angular/common/http";
import type { HttpRequest } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import {
	catchError,
	finalize,
	type Observable,
	shareReplay,
	switchMap,
	tap,
	throwError,
} from "rxjs";

import { AuthService } from "../../auth/services/auth.service";
import { AuthStore } from "../../auth/services/auth.store";
import { isMainApiRequest, isSessionEndpoint } from "./api-url";

/**
 * The 401-refresh interceptor (PLAN.md 5.4).
 *
 * Replaces the `isRefreshing` flag, the `failedQueue` array and the
 * `processQueue` resolver in frontend-react's main-client.ts. Concurrent
 * 401s all `switchMap` onto one shared refresh, so N failures cause exactly
 * one POST to /api/auth/refresh.
 *
 * `finalize(() => (refresh$ = null))` is load-bearing: it drops the shared
 * observable the instant the refresh settles, so the replayed token can
 * never be handed to a *later* 401. That is what keeps this the one
 * sanctioned `shareReplay` -- request dedup, not a cache (D6).
 */
let refresh$: Observable<string> | null = null;

/** Test seam: the module-level observable outlives a TestBed otherwise. */
export function resetRefreshState(): void {
	refresh$ = null;
}

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
	// Injected here, in the interceptor body: `catchError` runs its callback
	// outside the injection context, where `inject()` throws NG0203. (PLAN.md
	// 5.4's sketch calls `inject()` inside the callback -- see the handoff.)
	const authService = inject(AuthService);
	const authStore = inject(AuthStore);
	const router = inject(Router);

	return next(req).pipe(
		catchError((err: unknown) => {
			if (!isRecoverable401(err, req)) return throwError(() => err);

			refresh$ ??= authService.refreshToken().pipe(
				tap({
					error: () => {
						// Replaces React's `auth:logout` window event.
						authService.logout();
						authStore.redirectUrl.set(null);
						void router.navigate(["/login"]);
					},
				}),
				shareReplay(1),
				finalize(() => (refresh$ = null)),
			);

			return refresh$.pipe(
				switchMap((token) =>
					next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })),
				),
			);
		}),
	);
};

function isRecoverable401(err: unknown, req: HttpRequest<unknown>): boolean {
	return (
		err instanceof HttpErrorResponse &&
		err.status === 401 &&
		isMainApiRequest(req.url) &&
		!isSessionEndpoint(req.url)
	);
}
