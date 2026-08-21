import {
	computed,
	DestroyRef,
	inject,
	Injectable,
	Injector,
	signal,
	type Signal,
} from "@angular/core";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import {
	catchError,
	defer,
	distinctUntilChanged,
	exhaustMap,
	filter,
	forkJoin,
	map,
	merge,
	of,
	Subject,
	switchMap,
	tap,
	timer,
	type Observable,
} from "rxjs";

import { LoggerService } from "@core/services/logger.service";
import { NotificationService } from "@core/services/notification.service";

/** Refill once a `pop()` leaves fewer than this many questions buffered. */
export const QUEUE_LOW_WATER = 2;

/** How many questions one hydration fetches. */
export const HYDRATE_BATCH = 2;

/**
 * A burst of settings clicks costs one reset, not one per click. Only
 * *later* payload changes are debounced -- the first hydration fires
 * immediately, or the player would stare at an empty staff for 300ms on
 * every page load.
 */
export const RESET_DEBOUNCE_MS = 300;

export interface QuestionQueueConfig<TRequest, TQuestion> {
	/**
	 * The request payload, normally `computed(() => toRequest(settings()))`.
	 *
	 * **The queue keys on `JSON.stringify` of this value.** That is the
	 * invariant in `frontend/CLAUDE.md`: a setting that changes the payload
	 * resets the queue, and one that does not (game mode, the limits) keeps
	 * the prefetched questions. A setting that affects the request but does
	 * not flow through here would serve stale questions -- silently.
	 */
	request: Signal<TRequest>;
	/** Gate. Nothing is fetched until the display can draw. */
	enabled: Signal<boolean>;
	fetch: (request: TRequest) => Observable<TQuestion>;
}

/**
 * Prefetch buffer for game questions (D8, PLAN.md §5.5).
 *
 * Port of
 * frontend-react/src/features/identification-game/hooks/useQuestionQueue.ts.
 * It is **not** a cache and D6 does not apply to it: nothing is ever served
 * twice, and the whole point is that the next question is already in hand
 * when the player answers. The score is questions-per-minute, so fetch
 * latency lands directly in the player's rating.
 *
 * Two mechanisms React hand-rolled become operators, which is the redesign
 * PLAN.md §5.5 asks for rather than a line-by-line translation:
 *
 * - **`generationRef`, the stale-response guard, *is* `switchMap`.** A new
 *   payload unsubscribes everything the old one had in flight, including a
 *   low-water refill, so a late response cannot land in the new queue.
 * - **The reset debounce is a cancellable `timer`.** `switchMap` drops a
 *   pending one when the next change arrives, which is `debounceTime` with
 *   the first emission exempted -- React's `hasHydratedRef`.
 * - **`inflightRef`, the one-hydration-at-a-time guard, *is* `exhaustMap`.**
 *
 * Provided per game board, not in root: the buffer is that board's state
 * and dies with it.
 */
@Injectable()
export class QuestionQueueService<TQuestion> {
	private readonly logger = inject(LoggerService);
	private readonly notifications = inject(NotificationService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly injector = inject(Injector);

	private queue: TQuestion[] = [];

	private readonly _isInitializing = signal(true);

	/**
	 * True until the first hydration for the current payload settles. The
	 * board shows its "Loading sheet music..." overlay on this and does not
	 * pop while it is set.
	 */
	readonly isInitializing = this._isInitializing.asReadonly();

	/** How many questions are buffered. For tests and diagnostics. */
	get size(): number {
		return this.queue.length;
	}

	/**
	 * Fires when `pop()` drops the buffer below the low-water mark.
	 *
	 * A `Subject` and not a signal: this is an *event*, not state, and it
	 * must not replay a value to the next generation the way a signal read
	 * through `toObservable` would. PLAN.md §5.6 rules out `BehaviorSubject`
	 * *state*; a one-shot notifier is what a Subject is for.
	 */
	private readonly refill$ = new Subject<void>();

	/**
	 * Starts the queue. Call once, from an injection context.
	 *
	 * Everything after this is driven by the two signals: the queue resets
	 * when the serialized payload changes, and refills itself when `pop()`
	 * drops it below the low-water mark.
	 */
	connect<TRequest>(config: QuestionQueueConfig<TRequest, TQuestion>): void {
		const keyed = computed(() => {
			if (!config.enabled()) return null;
			const request = config.request();
			return { key: JSON.stringify(request), request };
		});

		toObservable(keyed, { injector: this.injector })
			.pipe(
				filter((value) => value !== null),
				distinctUntilChanged((a, b) => a.key === b.key),
				// Emptied the moment the payload changes, *before* the debounce,
				// which is React's own note on the same line: "the queue is
				// already cleared above, so no stale question can be served in
				// the meantime". Deferring it to when the debounce fires leaves
				// a 300ms window in which `pop()` still hands out a question
				// generated for the settings the player just changed.
				tap(() => this.discard()),
				switchMap((value, index) =>
					index === 0
						? of(value)
						: timer(RESET_DEBOUNCE_MS).pipe(map(() => value)),
				),
				switchMap(({ request }) => this.generation(request, config.fetch)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe();
	}

	/**
	 * Takes the next question, and tops the buffer up if that emptied it
	 * past the low-water mark. Returns null when the buffer is dry -- the
	 * board logs it and waits for the refill rather than blocking.
	 */
	pop(): TQuestion | null {
		const item = this.queue.shift() ?? null;

		if (item !== null && this.queue.length < QUEUE_LOW_WATER) {
			this.refill$.next();
		}

		return item;
	}

	/** Drops every buffered question and puts the board back on its overlay. */
	private discard(): void {
		this.queue = [];
		this._isInitializing.set(true);
	}

	/**
	 * One payload's worth of queue life: clear, hydrate once, then hydrate
	 * again on every refill until a new payload switches this whole stream
	 * away.
	 */
	private generation<TRequest>(
		request: TRequest,
		fetch: (request: TRequest) => Observable<TQuestion>,
	): Observable<unknown> {
		// Already discarded when the payload changed; repeated here because a
		// generation can also start from the initial emission, which does not
		// go through the debounce.
		this.discard();

		return merge(of(true), this.refill$.pipe(map(() => false))).pipe(
			exhaustMap((isInitial) =>
				this.hydrate(request, fetch).pipe(
					tap(() => {
						if (isInitial) this._isInitializing.set(false);
					}),
				),
			),
		);
	}

	/**
	 * Fetches `HYDRATE_BATCH` questions and appends whatever arrived.
	 *
	 * A partial failure is not fatal: the successes are queued, the player
	 * gets one toast, and the game carries on -- React's
	 * `Promise.allSettled` semantics, kept deliberately. `forkJoin` with a
	 * per-call `catchError` is the same contract, and it means this
	 * observable never errors, so `isInitializing` always clears.
	 */
	private hydrate<TRequest>(
		request: TRequest,
		fetch: (request: TRequest) => Observable<TQuestion>,
	): Observable<void> {
		const calls = Array.from({ length: HYDRATE_BATCH }, () =>
			defer(() => fetch(request)).pipe(
				map((question) => ({ question })),
				catchError((err: unknown) => {
					this.logger.error("Question fetch failed", err);
					return of({ question: null });
				}),
			),
		);

		return forkJoin(calls).pipe(
			map((results) => {
				let anyFailed = false;
				for (const result of results) {
					if (result.question !== null) this.queue.push(result.question);
					else anyFailed = true;
				}
				if (anyFailed) {
					this.notifications.showError(
						"Failed to load the next question. Please try again.",
					);
				}
			}),
		);
	}
}
