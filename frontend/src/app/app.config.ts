import {
	ApplicationConfig,
	provideBrowserGlobalErrorListeners,
	provideZonelessChangeDetection,
} from "@angular/core";
import {
	provideHttpClient,
	withFetch,
	withInterceptors,
} from "@angular/common/http";
import { provideRouter, withComponentInputBinding } from "@angular/router";

import { routes } from "./app.routes";
import { authInterceptor } from "./core/interceptors/auth.interceptor";
import { refreshInterceptor } from "./core/interceptors/refresh.interceptor";

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),

		// D4. Zoneless is Angular 22's default and zone.js is not installed,
		// so this is belt-and-braces -- but it is the line a reader greps for
		// to know change detection is signal-driven, and the line that would
		// fail loudly if anything ever pulled zone.js back in.
		provideZonelessChangeDetection(),

		// withComponentInputBinding: route params arrive as component inputs,
		// which is what the `input.required<string>()` half of PLAN.md 5.2's
		// parameterized rxResource pattern binds to.
		provideRouter(routes, withComponentInputBinding()),

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
