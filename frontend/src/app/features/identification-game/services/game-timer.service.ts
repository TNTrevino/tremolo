import { DestroyRef, inject, Injectable, signal } from "@angular/core";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import { EMPTY, interval, Subject, switchMap, type Observable } from "rxjs";

/**
 * The countdown for a timed game.
 *
 * Port of
 * frontend-react/src/features/identification-game/hooks/useGameTimer.ts --
 * with its central workaround **deliberately not ported**. React kept the
 * remaining seconds in a ref mirrored into state, and fired expiry from the
 * interval callback rather than from a `setState` updater, because
 * StrictMode double-invokes updaters in development and a side-effecting
 * updater there saved two game-end entries for one game. Angular has no
 * StrictMode and no double-invoked updater, so that whole mechanism has no
 * subject: one signal, one `interval(1000)`, `takeUntilDestroyed` for
 * teardown (PLAN.md §5.6).
 *
 * The save-exactly-once property it was protecting is still pinned, in
 * `game-state.service.spec.ts` and in this file's own spec -- by a test, not
 * by machinery.
 *
 * `useGameLifecycle`'s `endGameRef` has no port either. It existed to break
 * a circular hook dependency (the timer must end the game; starting the
 * game must start the timer). Two services and an `expired` observable have
 * no cycle to break.
 */
@Injectable()
export class GameTimerService {
	private readonly destroyRef = inject(DestroyRef);

	private readonly _remaining = signal(0);
	private readonly _isRunning = signal(false);
	private readonly _expired = new Subject<void>();

	/** Seconds left. */
	readonly remaining = this._remaining.asReadonly();
	readonly isRunning = this._isRunning.asReadonly();

	/** Fires once per countdown, when it reaches zero. */
	readonly expired: Observable<void> = this._expired.asObservable();

	constructor() {
		toObservable(this._isRunning)
			.pipe(
				switchMap((running) => (running ? interval(1000) : EMPTY)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => this.tick());
	}

	start(seconds: number): void {
		this._remaining.set(seconds);
		this._isRunning.set(true);
	}

	stop(): void {
		this._isRunning.set(false);
	}

	reset(): void {
		this._remaining.set(0);
		this._isRunning.set(false);
	}

	/** "M:SS", React's `formatTime`. */
	format(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}

	/**
	 * Clearing `isRunning` before emitting is what makes expiry fire once:
	 * the flag feeds the `switchMap` above, so the interval is torn down
	 * before any subscriber can react.
	 */
	private tick(): void {
		const next = Math.max(this._remaining() - 1, 0);
		this._remaining.set(next);

		if (next === 0) {
			this._isRunning.set(false);
			this._expired.next();
		}
	}
}
