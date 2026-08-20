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
	withComponentInputBinding,
	withRouterConfig,
} from "@angular/router";
import { provideIcons } from "@ng-icons/core";

import { routes } from "./app.routes";
import { TREMOLO_ICONS } from "./core/icons";
import { authInterceptor } from "./core/interceptors/auth.interceptor";
import { refreshInterceptor } from "./core/interceptors/refresh.interceptor";
import { GlobalErrorHandler } from "./core/services/global-error.handler";

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
		// onSameUrlNavigation "reload": re-navigating to the URL you are
		// already on re-runs its guards. That is what logging out uses to
		// reproduce React's behaviour, where clearing the store re-rendered
		// `ProtectedRoute` and bounced a signed-in-only page to /login while
		// leaving a public page alone.
		provideRouter(
			routes,
			withComponentInputBinding(),
			withRouterConfig({ onSameUrlNavigation: "reload" }),
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
