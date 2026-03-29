import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useNoteQueue } from "./useNoteQueue";
import { musicService } from "@/services/api";
import type { NoteGameResponse } from "@/services/api/types";

vi.mock("@/services/api", () => ({
	musicService: {
		generateNoteGame: vi.fn(),
	},
}));

const mockGenerate = musicService.generateNoteGame as Mock;

function fakeNote(name: string): NoteGameResponse {
	return {
		generatedXml: `<xml>${name}</xml>`,
		noteName: name,
		noteOctave: "4",
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("useNoteQueue", () => {
	it("hydrate prefetches notes on mount when isReady=true", async () => {
		mockGenerate
			.mockResolvedValueOnce(fakeNote("C"))
			.mockResolvedValueOnce(fakeNote("D"));

		const { result } = renderHook(() => useNoteQueue("C", "4", true));

		expect(result.current.isInitializing).toBe(true);

		await waitFor(() => {
			expect(result.current.isInitializing).toBe(false);
		});

		expect(mockGenerate).toHaveBeenCalledTimes(2);
		expect(mockGenerate).toHaveBeenCalledWith({ scale: "C", octave: "4" });
	});

	it("pop() returns queued item and triggers background refill", async () => {
		mockGenerate
			.mockResolvedValueOnce(fakeNote("C"))
			.mockResolvedValueOnce(fakeNote("D"))
			.mockResolvedValueOnce(fakeNote("E"))
			.mockResolvedValueOnce(fakeNote("F"));

		const { result } = renderHook(() => useNoteQueue("C", "4", true));

		await waitFor(() => {
			expect(result.current.isInitializing).toBe(false);
		});

		let note: NoteGameResponse | null = null;
		act(() => {
			note = result.current.pop();
		});

		expect(note).toEqual(fakeNote("C"));

		// pop() should have triggered a background hydrate (queue dropped below low water)
		await waitFor(() => {
			expect(mockGenerate).toHaveBeenCalledTimes(4);
		});
	});

	it("pop() returns null when queue is empty", () => {
		// Don't resolve anything — render with isReady=false so hydrate never runs
		const { result } = renderHook(() => useNoteQueue("C", "4", false));

		let note: NoteGameResponse | null;
		act(() => {
			note = result.current.pop();
		});

		expect(note!).toBeNull();
	});

	it("no fetches when isReady=false", async () => {
		const { result } = renderHook(() => useNoteQueue("C", "4", false));

		// Give it a tick to ensure nothing fires
		await new Promise((r) => setTimeout(r, 50));

		expect(result.current.isInitializing).toBe(true);
		expect(mockGenerate).not.toHaveBeenCalled();
	});

	it("concurrent hydrate calls are guarded by inflight ref", async () => {
		let resolveFirst!: (v: NoteGameResponse) => void;
		let resolveSecond!: (v: NoteGameResponse) => void;

		mockGenerate
			.mockImplementationOnce(
				() =>
					new Promise<NoteGameResponse>((r) => {
						resolveFirst = r;
					}),
			)
			.mockImplementationOnce(
				() =>
					new Promise<NoteGameResponse>((r) => {
						resolveSecond = r;
					}),
			);

		const { result } = renderHook(() => useNoteQueue("C", "4", true));

		// Initial hydrate is in-flight — pop should try to hydrate again but be blocked
		act(() => {
			result.current.pop();
		});

		// Still only 2 calls from the initial hydrate, not 4
		expect(mockGenerate).toHaveBeenCalledTimes(2);

		// Resolve the initial hydrate
		resolveFirst(fakeNote("C"));
		resolveSecond(fakeNote("D"));

		await waitFor(() => {
			expect(result.current.isInitializing).toBe(false);
		});
	});

	it("clears queue and re-initializes when scale changes", async () => {
		// Initial hydrate resolves immediately, but the pop-triggered refill
		// uses deferred promises so we can change the scale while it's in-flight.
		mockGenerate
			.mockResolvedValueOnce(fakeNote("C"))
			.mockResolvedValueOnce(fakeNote("D"));

		const { result, rerender } = renderHook(
			({ scale }) => useNoteQueue(scale, "4", true),
			{ initialProps: { scale: "C" } },
		);

		await waitFor(() => {
			expect(result.current.isInitializing).toBe(false);
		});

		// Set up deferred promises for the pop-triggered refill so it stays
		// in-flight when we change the scale.
		let resolveStale1!: (v: NoteGameResponse) => void;
		let resolveStale2!: (v: NoteGameResponse) => void;
		mockGenerate
			.mockImplementationOnce(
				() =>
					new Promise<NoteGameResponse>((r) => {
						resolveStale1 = r;
					}),
			)
			.mockImplementationOnce(
				() =>
					new Promise<NoteGameResponse>((r) => {
						resolveStale2 = r;
					}),
			);

		// Pop triggers a background refill that is now pending
		let note: NoteGameResponse | null = null;
		act(() => {
			note = result.current.pop();
		});
		expect(note).toEqual(fakeNote("C"));

		// Change scale while the old refill is still in-flight
		mockGenerate
			.mockResolvedValueOnce(fakeNote("E"))
			.mockResolvedValueOnce(fakeNote("F#"));

		rerender({ scale: "E" });

		expect(result.current.isInitializing).toBe(true);

		// Now resolve the stale in-flight hydrate -- these should be discarded
		resolveStale1(fakeNote("STALE_C1"));
		resolveStale2(fakeNote("STALE_C2"));

		await waitFor(() => {
			expect(result.current.isInitializing).toBe(false);
		});

		// Pop should return only the new scale's notes, not stale ones
		act(() => {
			note = result.current.pop();
		});
		expect(note).toEqual(fakeNote("E"));

		act(() => {
			note = result.current.pop();
		});
		expect(note).toEqual(fakeNote("F#"));
	});

	it("failed fetches in hydrate are handled gracefully (Promise.allSettled)", async () => {
		mockGenerate
			.mockRejectedValueOnce(new Error("network error"))
			.mockResolvedValueOnce(fakeNote("D"));

		const { result } = renderHook(() => useNoteQueue("C", "4", true));

		await waitFor(() => {
			expect(result.current.isInitializing).toBe(false);
		});

		// Only the successful note should be in the queue
		let note: NoteGameResponse | null = null;
		act(() => {
			note = result.current.pop();
		});

		expect(note).toEqual(fakeNote("D"));

		// The failed one should not appear
		let second: NoteGameResponse | null = null;
		act(() => {
			second = result.current.pop();
		});

		expect(second).toBeNull();
	});
});
