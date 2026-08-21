import { Injectable, signal } from "@angular/core";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import { EMPTY, interval, Subject, switchMap } from "rxjs";

/**
 * PHASE-5 SEAM. Port of
 * `features/identification-game/hooks/useGameTimer.ts` and the
 * `useGameLifecycle.ts` wrapper around it.
 *
 * A one-second countdown that fires `expired` when it reaches zero. Time mode
 * only: in notes mode nothing ever starts it.
 *
 * Two React mechanisms disappear:
 *
 * - **The `remainingRef` / `setTimeRemaining` pair.** React kept the count in
 *   a ref *and* in state because expiry had to fire from the interval
 *   callback rather than from a `setState` updater -- a side-effecting
 *   updater ran twice under StrictMode and saved duplicate game-end entries.
 *   A signal is read and written directly, so there is one copy of the count
 *   and the side effect is plainly in the tick.
 * - **`endGameRef`.** `useGameLifecycle` existed only to break the circle
 *   between "the timer must end the game" and "starting the game must start
 *   the timer", by handing the page a ref to assign after the engine
 *   returned. `expired` is an observable the composer subscribes to, so the
 *   circle never forms.
 *
 * `switchMap` over `isRunning` -- rather than one always-running `interval`
 * that the tick ignores while stopped -- is what keeps the first tick a full
 * second after `startTimer`, as React's effect-on-`isRunning` did.
 */
@Injectable()
export class GameTimerService {
	private readonly _timeRemaining = signal(0);
	private readonly _isRunning = signal(false);

	readonly timeRemaining = this._timeRemaining.asReadonly();
	readonly isRunning = this._isRunning.asReadonly();

	private readonly _expired = new Subject<void>();

	/** Fires once each time the countdown reaches zero. */
	readonly expired = this._expired.asObservable();

	constructor() {
		toObservable(this._isRunning)
			.pipe(
				switchMap((running) => (running ? interval(1000) : EMPTY)),
				takeUntilDestroyed(),
			)
			.subscribe(() => this.tick());
	}

	startTimer(seconds: number): void {
		this._timeRemaining.set(seconds);
		this._isRunning.set(true);
	}

	stopTimer(): void {
		this._isRunning.set(false);
	}

	resetTimer(): void {
		this._timeRemaining.set(0);
		this._isRunning.set(false);
	}

	/** `m:ss`. The score bar's only formatting. */
	formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}

	private tick(): void {
		const next = Math.max(this._timeRemaining() - 1, 0);
		this._timeRemaining.set(next);
		if (next === 0) {
			this._isRunning.set(false);
			this._expired.next();
		}
	}
}
