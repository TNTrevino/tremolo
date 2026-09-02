import { inject, Injectable, signal } from "@angular/core";

import { LoggerService } from "./logger.service";

/**
 * Toast notifications. Port of frontend-react/src/shared/hooks/useToast.tsx
 * (D13 -- we ship our own; ngx-toastr has no Angular 22 build).
 *
 * PHASE 1 SHIPS THE API SURFACE ONLY. Toasts are queued into the `toasts`
 * signal and echoed to the console; nothing renders them yet. Phase 2 owns
 * `core/components/toast/` and only has to read this signal -- the method
 * names, argument order and defaults below are the contract, and callers
 * written against them in Phase 1 must not need editing.
 *
 * Auto-dismissal is the container's job, exactly as in React: `duration`
 * is carried on the toast and the component times it out, then calls
 * `removeToast(id)`.
 */
export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
	id: string;
	type: ToastType;
	title?: string;
	message: string;
	duration: number;
}

const DEFAULT_DURATION_MS = 5000;

@Injectable({ providedIn: "root" })
export class NotificationService {
	private readonly logger = inject(LoggerService);
	private readonly _toasts = signal<Toast[]>([]);
	private nextId = 0;

	readonly toasts = this._toasts.asReadonly();

	showToast(
		message: string,
		type: ToastType = "info",
		title?: string,
		duration: number = DEFAULT_DURATION_MS,
	): void {
		const toast: Toast = {
			id: `toast-${this.nextId++}`,
			type,
			title,
			message,
			duration,
		};
		this._toasts.update((toasts) => [...toasts, toast]);
		this.logger.info(
			`[toast:${type}] ${title ? `${title} -- ` : ""}${message}`,
		);
	}

	showSuccess(message: string, title?: string): void {
		this.showToast(message, "success", title);
	}

	showError(message: string, title?: string): void {
		this.showToast(message, "error", title);
	}

	showWarning(message: string, title?: string): void {
		this.showToast(message, "warning", title);
	}

	showInfo(message: string, title?: string): void {
		this.showToast(message, "info", title);
	}

	removeToast(id: string): void {
		this._toasts.update((toasts) => toasts.filter((t) => t.id !== id));
	}
}
