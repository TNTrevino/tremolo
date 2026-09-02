import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

import { NotificationService } from "../../services/notification.service";
import { ToastItemComponent } from "./toast-item.component";

/**
 * The live end of `NotificationService` (D13 -- our own toast, because
 * ngx-toastr has no Angular 22 build).
 *
 * Phase 1 shipped the service with the toasts landing in a signal and
 * nothing rendering them. This component is the whole of the missing half:
 * it reads that signal and hands each toast to `<app-toast-item>`, which
 * owns its own dismissal timer. The service's API surface is untouched, so
 * every Phase 1 caller keeps working.
 *
 * It hangs off the app shell, outside the router outlet, exactly where
 * `ToastContainerWrapper` sat in React's `App.tsx` -- a toast raised by a
 * page must outlive a navigation away from it.
 */
@Component({
	selector: "app-toast-container",
	imports: [ToastItemComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (toasts().length > 0) {
			<div
				class="pointer-events-none fixed top-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:top-4 sm:right-4 sm:w-auto sm:max-w-md"
				aria-live="polite"
				aria-atomic="true"
			>
				@for (toast of toasts(); track toast.id) {
					<app-toast-item [toast]="toast" (closed)="remove($event)" />
				}
			</div>
		}
	`,
})
export class ToastContainerComponent {
	private readonly notifications = inject(NotificationService);

	protected readonly toasts = this.notifications.toasts;

	protected remove(id: string): void {
		this.notifications.removeToast(id);
	}
}
