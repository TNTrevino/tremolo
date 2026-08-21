import { Injector, runInInjectionContext, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Subject, of, throwError, type Observable } from "rxjs";

import { NotificationService } from "@core/services/notification.service";

import type { GeneratedQuestion } from "../models/game-state.models";
import {
	QuestionQueueService,
	RESET_DEBOUNCE_MS,
} from "./question-queue.service";

/**
 * The queue's four load-bearing behaviours, which `phase-5.md` names as
 * required tests:
 *
 * - it resets when the *payload* changes
 * - it does **not** reset when a non-payload setting changes
 * - a response still in flight when a reset happens is dropped
 * - popping below the low-water mark refills
 *
 * Everything is driven through `TestBed.tick()` rather than a fixture:
 * `connect()` reads its signals through `toObservable`, which delivers on
 * the effect queue.
 */

interface TestQuestion extends GeneratedQuestion {
	id: number;
}

interface TestRequest {
	clefs: string[];
}

/** Advances time past the reset debounce and flushes the effect queue. */
function settle(ms = RESET_DEBOUNCE_MS + 1): void {
	TestBed.tick();
	vi.advanceTimersByTime(ms);
	TestBed.tick();
}

describe("QuestionQueueService", () => {
	let injector: Injector;
	let queue: QuestionQueueService<TestQuestion>;
	let showError: ReturnType<typeof vi.fn>;
	/** One entry per `fetch` call, in order. */
	let calls: TestRequest[];

	beforeEach(() => {
		vi.useFakeTimers();
		showError = vi.fn();
		calls = [];

		TestBed.configureTestingModule({
			providers: [
				QuestionQueueService,
				{ provide: NotificationService, useValue: { showError } },
			],
		});

		injector = TestBed.inject(Injector);
		queue = TestBed.inject(
			QuestionQueueService,
		) as QuestionQueueService<TestQuestion>;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	/** Connects the queue to a settings-shaped signal with a counting fetch. */
	function connect(options: {
		request: ReturnType<typeof signal<TestRequest>>;
		enabled?: ReturnType<typeof signal<boolean>>;
		fetch?: (request: TestRequest) => Observable<TestQuestion>;
	}): void {
		let nextId = 1;
		const fetch =
			options.fetch ??
			((request: TestRequest) => {
				calls.push(request);
				return of({ id: nextId++, generatedXml: "<score/>" });
			});

		runInInjectionContext(injector, () => {
			queue.connect({
				request: options.request,
				enabled: options.enabled ?? signal(true),
				fetch: (request: TestRequest) => {
					if (options.fetch) calls.push(request);
					return fetch(request);
				},
			});
		});
	}

	it("hydrates a full batch immediately, without waiting out the debounce", () => {
		const request = signal<TestRequest>({ clefs: ["treble"] });
		connect({ request });

		// No timer advance at all: the first hydration must not be debounced.
		TestBed.tick();

		expect(calls).toHaveLength(2);
		expect(queue.size).toBe(2);
		expect(queue.isInitializing()).toBe(false);
	});

	it("resets and refetches when a payload-affecting setting changes", () => {
		const request = signal<TestRequest>({ clefs: ["treble"] });
		connect({ request });
		settle();
		expect(queue.size).toBe(2);

		request.set({ clefs: ["treble", "bass"] });
		settle();

		expect(calls).toHaveLength(4);
		expect(calls[2]).toEqual({ clefs: ["treble", "bass"] });
		// Reset, then rehydrated -- not four questions deep.
		expect(queue.size).toBe(2);
	});

	it("does not reset when a setting leaves the payload unchanged", () => {
		const request = signal<TestRequest>({ clefs: ["treble"] });
		connect({ request });
		settle();
		expect(calls).toHaveLength(2);
		const buffered = queue.size;

		// What a game-mode or time-limit click looks like from here: the
		// settings signal changed, so `toRequest` re-ran, but it produced an
		// equal payload. The serialized key is what the queue compares.
		request.set({ clefs: ["treble"] });
		settle();

		expect(calls).toHaveLength(2);
		expect(queue.size).toBe(buffered);
	});

	it("debounces a burst of payload changes into one reset", () => {
		const request = signal<TestRequest>({ clefs: ["treble"] });
		connect({ request });
		settle();
		expect(calls).toHaveLength(2);

		request.set({ clefs: ["bass"] });
		TestBed.tick();
		vi.advanceTimersByTime(100);
		request.set({ clefs: ["alto"] });
		TestBed.tick();
		vi.advanceTimersByTime(100);
		request.set({ clefs: ["tenor"] });
		settle();

		// One refetch for the whole burst, and it used the last payload.
		expect(calls).toHaveLength(4);
		expect(calls[2]).toEqual({ clefs: ["tenor"] });
	});

	it("drops a response still in flight when the payload changes", () => {
		const first = new Subject<TestQuestion>();
		const request = signal<TestRequest>({ clefs: ["treble"] });

		connect({
			request,
			fetch: (req) =>
				req.clefs[0] === "treble"
					? first
					: of({ id: 99, generatedXml: "<score/>" }),
		});
		TestBed.tick();

		// The first generation's two fetches are open.
		expect(queue.size).toBe(0);

		request.set({ clefs: ["bass"] });
		settle();
		expect(queue.size).toBe(2);

		// The stale generation answers late. `switchMap` already unsubscribed
		// both of its calls, so nothing reaches the queue -- if it had not,
		// this would push the buffer to 4.
		first.next({ id: 1, generatedXml: "<stale/>" });
		first.complete();
		TestBed.tick();

		expect(queue.size).toBe(2);
		expect(queue.pop()?.id).toBe(99);
	});

	it("refills when a pop drops the buffer below the low-water mark", () => {
		const request = signal<TestRequest>({ clefs: ["treble"] });
		connect({ request });
		settle();
		expect(calls).toHaveLength(2);
		expect(queue.size).toBe(2);

		// 2 -> 1 is below the low-water mark of 2, so this pop refills.
		queue.pop();
		TestBed.tick();

		expect(calls).toHaveLength(4);
		expect(queue.size).toBe(3);
	});

	it("does not refill on a pop from an empty buffer", () => {
		const request = signal<TestRequest>({ clefs: ["treble"] });
		const pending = new Subject<TestQuestion>();
		connect({ request, fetch: () => pending });
		TestBed.tick();

		// The initial hydration is in flight and nothing is buffered yet.
		expect(calls).toHaveLength(2);
		expect(queue.size).toBe(0);

		// React guards the refill on `item !== null`: a pop that got nothing
		// must not stack a second hydration on top of the one already open.
		expect(queue.pop()).toBeNull();
		TestBed.tick();
		expect(calls).toHaveLength(2);
	});

	it("keeps the successes and warns once when part of a batch fails", () => {
		const request = signal<TestRequest>({ clefs: ["treble"] });
		let call = 0;

		connect({
			request,
			fetch: () => {
				call += 1;
				return call === 1
					? throwError(() => new Error("boom"))
					: of({ id: call, generatedXml: "<score/>" });
			},
		});
		settle();

		expect(queue.size).toBe(1);
		expect(queue.isInitializing()).toBe(false);
		expect(showError).toHaveBeenCalledTimes(1);
		expect(showError).toHaveBeenCalledWith(
			"Failed to load the next question. Please try again.",
		);
	});

	it("fetches nothing until it is enabled", () => {
		const request = signal<TestRequest>({ clefs: ["treble"] });
		const enabled = signal(false);
		connect({ request, enabled });
		settle();

		expect(calls).toHaveLength(0);
		expect(queue.isInitializing()).toBe(true);

		enabled.set(true);
		// Still no debounce: becoming enabled is the first hydration.
		TestBed.tick();

		expect(calls).toHaveLength(2);
		expect(queue.isInitializing()).toBe(false);
	});
});
