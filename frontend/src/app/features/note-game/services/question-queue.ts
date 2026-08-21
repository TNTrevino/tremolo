import { DestroyRef, type Injector, signal, type Signal } from "@angular/core";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import {
	catchError,
	distinctUntilChanged,
	filter,
	finalize,
	forkJoin,
	map,
	type Observable,
	of,
	switchMap,
	tap,
	timer,
} from "rxjs";

/**
 * PHASE-5 SEAM. Port of
 * `features/identification-game/hooks/useQuestionQueue.ts`, in the operator
 * shape PLAN.md §5.5 prescribes.
 *
 * A small FIFO buffer of pre-fetched questions so the next one renders the
 * instant the player answers. **Not a cache** (D8): the score is
 * notes-per-minute, so fetch latency lands directly in the player's rating.
 * Nothing here is shared between components and nothing is replayed.
 *
 * React's three constants survive exactly: low water **2**, hydrate batch
 * **2**, reset debounce **300ms**. Two of its hand-rolled mechanisms become
 * operators:
 *
 * - the `generationRef` stale-response guard **is** `switchMap`'s
 *   cancellation -- and it is now a real cancellation, where React let the
 *   superseded promises resolve and threw the results away;
 * - the reset debounce **is** a `timer()` inside that `switchMap`, so a burst
 *   of settings clicks costs one refetch rather than one per click.
 *
 * The generation counter is still kept, because the refill `pop()` triggers
 * runs outside that chain and has to be able to tell that it is stale.
 *
 * **The queue keys on the serialized request.** Only a setting that changes
 * the request payload resets it -- that is the invariant `frontend/CLAUDE.md`
 * states and it is load-bearing: a setting that affects the request but does
 * not reach here means prefetched questions go stale.
 */

const QUEUE_LOW_WATER = 2;
const HYDRATE_BATCH = 2;
const RESET_DEBOUNCE_MS = 300;

export interface QuestionQueueOptions<TRequest, TQuestion> {
	/**
	 * The request payload, or `null` while the queue is gated (the note game
	 * gates on the OSMD container being mounted -- React's `isReady`).
	 */
	request: Signal<TRequest | null>;
	/** Fetches one question. */
	fetchQuestion: (request: TRequest) => Observable<TQuestion>;
	/** Shown to the player when a fetch fails; the toast service, curried. */
	onError: (message: string) => void;
	/** Logging sink for the underlying failure. */
	onFetchFailure?: (error: unknown) => void;
	/**
	 * The owner's injector. Passed explicitly rather than relying on an
	 * ambient injection context, because `pop()` starts a refill from a click
	 * handler -- long after any context has closed -- and that stream still
	 * has to die with the component (PLAN.md §5.6).
	 */
	injector: Injector;
}

export class QuestionQueue<TRequest, TQuestion> {
	private readonly queue: TQuestion[] = [];
	private inflight = false;
	private generation = 0;
	private currentRequest: TRequest | null = null;

	private readonly _isInitializing = signal(true);

	/** True until the first batch settles; the staff shows its overlay. */
	readonly isInitializing = this._isInitializing.asReadonly();

	private readonly destroyRef: DestroyRef;

	constructor(
		private readonly options: QuestionQueueOptions<TRequest, TQuestion>,
	) {
		this.destroyRef = options.injector.get(DestroyRef);

		toObservable(options.request, { injector: options.injector })
			.pipe(
				filter((request): request is TRequest => request !== null),
				distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
				// Clearing happens the moment the request changes, before the
				// debounce, so no stale question can be served in the meantime.
				tap((request) => {
					this.generation++;
					this.queue.length = 0;
					this.inflight = false;
					this.currentRequest = request;
					this._isInitializing.set(true);
				}),
				switchMap((request, index) => {
					const generation = this.generation;
					// The first hydration fires immediately; later resets are
					// debounced. `switchMap` drops a pending one when a newer
					// change arrives.
					const start = index === 0 ? of(0) : timer(RESET_DEBOUNCE_MS);
					return start.pipe(switchMap(() => this.hydrate(request, generation)));
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => this._isInitializing.set(false));
	}

	/**
	 * Takes the next question, or `null` when the buffer is empty (the
	 * display then waits for the next hydration). Dropping below the low
	 * water mark starts a background refill.
	 */
	pop(): TQuestion | null {
		const item = this.queue.shift() ?? null;

		if (item !== null && this.queue.length < QUEUE_LOW_WATER) {
			const request = this.currentRequest;
			if (request !== null) {
				this.hydrate(request, this.generation)
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe();
			}
		}

		return item;
	}

	/**
	 * Fetches `HYDRATE_BATCH` questions and appends the ones that arrived.
	 *
	 * `forkJoin` over per-request `catchError` is React's `Promise.allSettled`:
	 * one failure does not lose the batch's other question, and the player is
	 * told once per batch rather than once per failure.
	 */
	private hydrate(request: TRequest, generation: number): Observable<void> {
		// One batch at a time. Completing rather than staying silent matters:
		// the reset chain clears `isInitializing` on this stream's emission,
		// and React's early return resolved its promise the same way.
		if (this.inflight) return of(undefined);
		this.inflight = true;

		const attempts = Array.from({ length: HYDRATE_BATCH }, () =>
			this.options.fetchQuestion(request).pipe(
				map((question) => ({ ok: true as const, question })),
				catchError((error: unknown) => {
					this.options.onFetchFailure?.(error);
					return of({ ok: false as const });
				}),
			),
		);

		return forkJoin(attempts).pipe(
			tap((results) => {
				// A hydration started before the last reset must not seed the
				// new queue. `switchMap` cancels the reset-driven one; this
				// catches the fire-and-forget refill from `pop()`.
				if (generation !== this.generation) return;

				let anyFailed = false;
				for (const result of results) {
					if (result.ok) this.queue.push(result.question);
					else anyFailed = true;
				}

				if (anyFailed) {
					this.options.onError(
						"Failed to load the next question. Please try again.",
					);
				}
			}),
			finalize(() => {
				this.inflight = false;
			}),
			map(() => undefined),
		);
	}
}
