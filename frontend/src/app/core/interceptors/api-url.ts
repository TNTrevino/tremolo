import { environment } from "../../../environments/environment";

/**
 * Which backend a request is going to.
 *
 * The app talks to two services directly and only one of them has auth:
 * the Go "main" service (JWT) and the Python "music" service (open). The
 * auth interceptor must never leak a bearer token to the music service, so
 * every attach decision runs through here.
 */
export function isMainApiRequest(url: string): boolean {
	return environment.mainApi.length > 0 && url.startsWith(environment.mainApi);
}

/**
 * Endpoints that *establish* a session: login, register, refresh, and the
 * Google code exchange.
 *
 * A 401 from one of these is a rejected credential, not an expired session,
 * so the refresh interceptor must let it through untouched. Getting this
 * wrong is exactly the React bug the E2E suite documents -- there, a wrong
 * password surfaces as "Please log in again" because the failed login was
 * run through the refresh path.
 *
 * `/api/auth/me` and `/api/auth/google/link` are deliberately NOT here: they
 * are ordinary authenticated calls, and a 401 from them really is an expiry
 * that a refresh should recover.
 */
const SESSION_ENDPOINTS = [
	"/api/auth/login",
	"/api/auth/register",
	"/api/auth/refresh",
	"/api/auth/google/callback",
];

export function isSessionEndpoint(url: string): boolean {
	return SESSION_ENDPOINTS.some((path) => url.includes(path));
}
