import { DestroyRef, inject, Injectable, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { timer } from "rxjs";

const RESET_DELAY_MS = 1500;

/**
 * Port of frontend-react/src/shared/hooks/useCopyToClipboard.ts.
 *
 * Copies text and flips a transient `copied` flag for 1.5s so a caller can
 * swap an icon or label to confirm the copy happened (the join-code cards
 * in the classes feature are the consumers).
 *
 * **Not** root-provided. `copied` was per-hook state in React; a root
 * singleton would make two join-code buttons on one page light up
 * together. Components add it to their own `providers: [ClipboardService]`,
 * which gives each instance its own flag and ties the reset timer to that
 * component's lifetime.
 */
@Injectable()
export class ClipboardService {
	private readonly destroyRef = inject(DestroyRef);
	private readonly _copied = signal(false);

	readonly copied = this._copied.asReadonly();

	copy(text: string): void {
		navigator.clipboard.writeText(text).then(
			() => {
				this._copied.set(true);
				timer(RESET_DELAY_MS)
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe(() => this._copied.set(false));
			},
			() => {
				// Clipboard access can fail (permissions, insecure context);
				// silently no-op -- the code is still on screen for the teacher
				// to read aloud. Same swallow as the React hook's empty catch.
			},
		);
	}
}
