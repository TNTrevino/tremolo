import { Injector, signal, type WritableSignal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Subject, throwError } from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";

import { QuestionQueue } from "./question-queue";

/**
 * Port of frontend-react/src/features/note-game/hooks/useNoteQueue.test.ts,
 * re-pointed at the generic queue underneath it (the React test exercised
 * the note-game wrapper, but every assertion in it is about the queue).
 */

interface Request {
	scale: string;
}
interface Question {
	generatedXml: string;
	noteName: string;
}

const note = (name: string): Question => ({
	generatedXml: `<xml>${name}</xml>`,
	noteName: name,
});

describe("QuestionQueue", () => {
	let request: WritableSignal<Request | null>;
	let pending: Subject<Question>[];
	let fetchQuestion: Mock<(request: Request) => Subject<Question>>;
	let onError: Mock<(message: string) => void>;

	beforeEach(() => {
		vi.useFakeTimers();
		request = signal<Request | null>(null);
		pending = [];
		onError = vi.fn<(message: string) => void>();
		fetchQuestion = vi.fn<(request: Request) => Subject<Question>>(() => {
			const subject = new Subject<Question>();
			pending.push(subject);
			return subject;
		});
	});

	afterEach(() => {
		TestBed.resetTestingModule();
		vi.useRealTimers();
	});

	function makeQueue(): QuestionQueue<Request, Question> {
		return new QuestionQueue<Request, Question>({
			request,
			fetchQuestion,
			onError,
			injector: TestBed.inject(Injector),
		});
	}

	/** Answers every outstanding fetch, in order, with the given notes. */
	function resolve(...names: string[]): void {
		const batch = pending.splice(0, names.length);
		batch.forEach((subject, i) => {
			subject.next(note(names[i]!));
			subject.complete();
		});
	}

	it("fetches nothing while the request is null (display not ready)", () => {
		const queue = makeQueue();
		TestBed.tick();
		vi.advanceTimersByTime(1000);

		expect(fetchQuestion).not.toHaveBeenCalled();
		expect(queue.isInitializing()).toBe(true);
		expect(queue.pop()).toBeNull();
	});

	it("hydrates a batch of two as soon as the request appears", () => {
		const queue = makeQueue();
		request.set({ scale: "C" });
		TestBed.tick();

		expect(fetchQuestion).toHaveBeenCalledTimes(2);
		expect(fetchQuestion).toHaveBeenCalledWith({ scale: "C" });
		expect(queue.isInitializing()).toBe(true);

		resolve("C", "D");
		expect(queue.isInitializing()).toBe(false);
		expect(queue.pop()).toEqual(note("C"));
	});

	it("does not debounce the first hydration", () => {
		makeQueue();
		request.set({ scale: "C" });
		TestBed.tick();

		// No 300ms wait needed: the game must not start blank.
		expect(fetchQuestion).toHaveBeenCalledTimes(2);
	});

	it("refills in the background once the buffer drops below low water", () => {
		const queue = makeQueue();
		request.set({ scale: "C" });
		TestBed.tick();
		resolve("C", "D");

		expect(queue.pop()).toEqual(note("C"));

		// One left, below the low-water mark of 2.
		expect(fetchQuestion).toHaveBeenCalledTimes(4);
		resolve("E", "F");

		expect(queue.pop()).toEqual(note("D"));
		expect(queue.pop()).toEqual(note("E"));
	});

	it("runs one batch at a time", () => {
		const queue = makeQueue();
		request.set({ scale: "C" });
		TestBed.tick();

		// The initial hydration is still in flight; popping must not start a
		// second batch on top of it.
		queue.pop();
		expect(fetchQuestion).toHaveBeenCalledTimes(2);

		resolve("C", "D");
		expect(queue.isInitializing()).toBe(false);
	});

	it("debounces a burst of setting changes into one refetch", () => {
		makeQueue();
		request.set({ scale: "C" });
		TestBed.tick();
		resolve("C", "D");
		fetchQuestion.mockClear();

		request.set({ scale: "D" });
		TestBed.tick();
		vi.advanceTimersByTime(100);
		request.set({ scale: "E" });
		TestBed.tick();
		vi.advanceTimersByTime(100);
		request.set({ scale: "F" });
		TestBed.tick();

		// Nothing yet -- each change cancelled the previous debounce.
		expect(fetchQuestion).not.toHaveBeenCalled();

		vi.advanceTimersByTime(300);
		expect(fetchQuestion).toHaveBeenCalledTimes(2);
		expect(fetchQuestion).toHaveBeenCalledWith({ scale: "F" });
	});

	it("clears the buffer the moment the request changes, before the debounce", () => {
		const queue = makeQueue();
		request.set({ scale: "C" });
		TestBed.tick();
		resolve("C", "D");

		request.set({ scale: "G" });
		TestBed.tick();

		// A question generated for the old scale must never be served.
		expect(queue.pop()).toBeNull();
		expect(queue.isInitializing()).toBe(true);
	});

	it("ignores a settings change that does not alter the request payload", () => {
		makeQueue();
		request.set({ scale: "C" });
		TestBed.tick();
		resolve("C", "D");
		fetchQuestion.mockClear();

		// A new object, the same payload -- e.g. the time limit changed,
		// which the note endpoint never sees.
		request.set({ scale: "C" });
		TestBed.tick();
		vi.advanceTimersByTime(1000);

		expect(fetchQuestion).not.toHaveBeenCalled();
	});

	it("drops a stale in-flight batch rather than seeding the new queue", () => {
		const queue = makeQueue();
		request.set({ scale: "C" });
		TestBed.tick();
		resolve("C", "D");

		// Pop starts a background refill for scale C...
		queue.pop();
		const stale = pending.splice(0, 2);

		// ...and the scale changes while it is out.
		request.set({ scale: "E" });
		TestBed.tick();
		vi.advanceTimersByTime(300);

		stale.forEach((subject) => {
			subject.next(note("STALE"));
			subject.complete();
		});

		resolve("E", "F");
		expect(queue.pop()).toEqual(note("E"));
		expect(queue.pop()).toEqual(note("F"));
		expect(queue.pop()).toBeNull();
	});

	it("keeps the questions that arrived when one of a batch fails", () => {
		const queue = makeQueue();
		fetchQuestion.mockImplementationOnce(
			() => throwError(() => new Error("network")) as never,
		);
		request.set({ scale: "C" });
		TestBed.tick();

		resolve("D");

		expect(queue.isInitializing()).toBe(false);
		expect(queue.pop()).toEqual(note("D"));
		expect(onError).toHaveBeenCalledTimes(1);
		expect(onError).toHaveBeenCalledWith(
			"Failed to load the next question. Please try again.",
		);
	});

	it("stops fetching once its injector is destroyed", () => {
		makeQueue();
		request.set({ scale: "C" });
		TestBed.tick();
		resolve("C", "D");
		fetchQuestion.mockClear();

		TestBed.resetTestingModule();

		request.set({ scale: "G" });
		vi.advanceTimersByTime(1000);
		expect(fetchQuestion).not.toHaveBeenCalled();
	});
});
