import {
	ApplicationConfig,
	ErrorHandler,
	provideBrowserGlobalErrorListeners,
	provideZonelessChangeDetection,
} from "@angular/core";
import {
	provideHttpClient,
	withFetch,
	withInterceptors,
} from "@angular/common/http";
import {
	provideRouter,
	type RouterConfigOptions,
	withComponentInputBinding,
	withRouterConfig,
} from "@angular/router";
import { provideIcons } from "@ng-icons/core";

import { routes } from "./app.routes";
import { TREMOLO_ICONS } from "./core/icons";
import { authInterceptor } from "./core/interceptors/auth.interceptor";
import { refreshInterceptor } from "./core/interceptors/refresh.interceptor";
import { GlobalErrorHandler } from "./core/services/global-error.handler";

/**
 * Half of the logout bounce, and exported so `app.routes.spec.ts` can drive
 * the real thing rather than a copy of it.
 *
 * `onSameUrlNavigation: "reload"` lets a navigation to the URL you are already
 * on be processed instead of dropped. On its own it does **not** re-run
 * `canActivate` -- the routes' `runGuardsAndResolvers: "always"` does that (see
 * app.routes.ts). Both are needed for logging out on a guarded page to bounce
 * to /login the way React's `ProtectedRoute` did.
 */
export const ROUTER_CONFIG: RouterConfigOptions = {
	onSameUrlNavigation: "reload",
};

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),

		// D4. Zoneless is Angular 22's default and zone.js is not installed,
		// so this is belt-and-braces -- but it is the line a reader greps for
		// to know change detection is signal-driven, and the line that would
		// fail loudly if anything ever pulled zone.js back in.
		provideZonelessChangeDetection(),

		// The single error boundary Angular allows (PLAN.md 8). It logs and
		// toasts; the granularity trade-off is documented on the class.
		{ provide: ErrorHandler, useClass: GlobalErrorHandler },

		// withComponentInputBinding: route params arrive as component inputs,
		// which is what the `input.required<string>()` half of PLAN.md 5.2's
		// parameterized rxResource pattern binds to.
		//
		// ROUTER_CONFIG is the logout bounce's other half; see above.
		provideRouter(
			routes,
			withComponentInputBinding(),
			withRouterConfig(ROUTER_CONFIG),
		),

		// D12. Only the icons the app actually uses; see core/icons.ts.
		provideIcons(TREMOLO_ICONS),

		// Order matters. `authInterceptor` runs first and attaches the bearer
		// token; `refreshInterceptor` sits closer to the backend, so the 401 it
		// catches is the one the token failed on, and its retry re-attaches the
		// refreshed token itself (PLAN.md 5.4).
		provideHttpClient(
			withFetch(),
			withInterceptors([authInterceptor, refreshInterceptor]),
		),
	],
};
