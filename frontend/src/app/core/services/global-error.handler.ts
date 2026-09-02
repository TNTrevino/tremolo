import { ErrorHandler, inject, Injectable, Injector } from "@angular/core";

import { getErrorMessage } from "../../shared/utils/error.utils";
import { LoggerService } from "./logger.service";
import { NotificationService } from "./notification.service";

/**
 * The app's one error boundary (PLAN.md 8, "No per-component error
 * boundaries in Angular").
 *
 * React had three tiers: a root `ErrorBoundary`, a second one inside the
 * shell around the routed page, and `ComponentErrorBoundary` +
 * `fallbacks/` for individual widgets (the OSMD staff, the game board).
 * Angular has no equivalent -- a component cannot catch a descendant's
 * render error -- so the granularity here is deliberately coarser and is
 * recorded as such:
 *
 * - **What is caught:** anything that reaches Angular's `ErrorHandler` --
 *   uncaught exceptions in lifecycle hooks, template expressions, event
 *   handlers, and (via `provideBrowserGlobalErrorListeners()`) unhandled
 *   promise rejections.
 * - **What the user sees:** an error toast, and the page they were already
 *   on. Nothing is replaced by a fallback card, and no subtree is isolated
 *   -- a component that throws mid-render leaves whatever it had already
 *   rendered on screen.
 * - **What is lost:** the per-widget retry affordances
 *   (`SheetMusicFallback`, `GameBoardFallback`) and the full-page "Try
 *   Again / Reload / Go Home" card. Where a feature genuinely needs a
 *   contained failure state, it owns it locally -- an `@if (error())`
 *   branch rendering `<app-error />`, which is the PLAN.md 5.2 pattern and
 *   is how every data-loading page already handles a failed request.
 *
 * The toast title matches React's boundary heading so the copy a user sees
 * for an app-level failure is unchanged. `navigation.spec.ts` asserts that
 * text is absent on a healthy page, which it is: nothing renders until
 * something actually throws.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
	// Resolved lazily. The ErrorHandler is constructed very early in
	// bootstrap, before the services it reports through are wanted, and an
	// error thrown while building the reporter would be unreportable.
	private readonly injector = inject(Injector);

	handleError(error: unknown): void {
		try {
			this.injector.get(LoggerService).error("Unhandled error", error);
			this.injector
				.get(NotificationService)
				.showError(getErrorMessage(error), "Something went wrong");
		} catch {
			// Last resort: never let the error reporter throw its own error,
			// which would recurse straight back into here.
			console.error(error);
		}
	}
}
