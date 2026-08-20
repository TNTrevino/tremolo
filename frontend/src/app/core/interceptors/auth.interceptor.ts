import type { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";

import { TokenStorage } from "../../auth/services/token.storage";
import { isMainApiRequest } from "./api-url";

/**
 * Attaches the bearer token -- to the Go main service only.
 *
 * React had one axios instance per backend and only the main one carried a
 * request interceptor. Angular has a single `HttpClient`, so the "which
 * backend" test that used to be implicit in the instance is explicit here.
 * The music service is unauthenticated and must never see the token.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
	if (!isMainApiRequest(req.url)) return next(req);

	const token = inject(TokenStorage).getAccessToken();
	if (!token) return next(req);

	return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
