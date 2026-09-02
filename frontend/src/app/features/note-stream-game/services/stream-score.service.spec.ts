import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StreamNote } from "../models/note-stream.models";
import { NoteSpawnerService } from "./note-spawner.service";
import { StreamScoreService } from "./stream-score.service";
import { StreamTransportService } from "./stream-transport.service";

/**
 * The scoring model, with the two things it reads pinned down: a real
 * transport running at 60 BPM off a fake clock, and a stub spawner whose
 * note list is set by hand.
 *
 * The transport is the real one on purpose -- the beat grid a press is
 * judged against is the same arithmetic the scroll uses, and a stubbed
 * `beatToTimeMs` would let the two drift apart without a test noticing. At
 * 60 BPM with the fake clock starting at zero, beat *n* falls at
 * `4000 + n * 1000` ms: the count-in is four beats long.
 */

/** The spawner reduced to what the score service actually reads. */
class SpawnerStub {
	readonly notes = signal<StreamNote[]>([]);
}

let nextId = 0;

/** A note at a beat. Ids are unique per spec run, as the real spawner's are. */
function note(beat: number, name: string): StreamNote {
	return {
		id: nextId++,
		name,
		diatonicIndex: 28,
		accidental: null,
		beat,
	};
}

describe("StreamScoreService", () => {
	let score: StreamScoreService;
	let transport: StreamTransportService;
	let notes: SpawnerStub["notes"];

	beforeEach(() => {
		vi.useFakeTimers();
		nextId = 0;

		const spawner = new SpawnerStub();
		notes = spawner.notes;

		TestBed.configureTestingModule({
			providers: [
				StreamScoreService,
				StreamTransportService,
				{ provide: NoteSpawnerService, useValue: spawner },
			],
		});

		transport = TestBed.inject(StreamTransportService);
		transport.now = () => 0;
		transport.start(60);

		score = TestBed.inject(StreamScoreService);
	});

	afterEach(() => {
		transport.stop();
		vi.useRealTimers();
	});

	/** The wall-clock ms a beat falls on. */
	const at = (beat: number): number => transport.beatToTimeMs(beat);

	/** Presses `name` `deltaMs` away from beat `beat`'s moment. */
	function press(
		name: string,
		beat: number,
		deltaMs: number,
	): ReturnType<StreamScoreService["judgePress"]> {
		return score.judgePress(name, at(beat) + deltaMs);
	}

	/** Lands `count` perfect hits on consecutive beats. */
	function perfectRun(count: number): void {
		notes.set(Array.from({ length: count }, (_, beat) => note(beat, "C")));
		for (let beat = 0; beat < count; beat++) press("C", beat, 0);
	}

	describe("hit windows", () => {
		beforeEach(() => {
			notes.set([note(0, "C")]);
		});

		it("calls 60 ms perfect and 61 ms great", () => {
			expect(press("C", 0, 59)?.judgment).toBe("perfect");

			score.reset();
			expect(press("C", 0, 60)?.judgment).toBe("perfect");

			score.reset();
			expect(press("C", 0, 61)?.judgment).toBe("great");
		});

		it("calls 120 ms great and 121 ms good", () => {
			expect(press("C", 0, 119)?.judgment).toBe("great");

			score.reset();
			expect(press("C", 0, 120)?.judgment).toBe("great");

			score.reset();
			expect(press("C", 0, 121)?.judgment).toBe("good");
		});

		it("calls 180 ms good and 181 ms nothing at all", () => {
			expect(press("C", 0, 179)?.judgment).toBe("good");

			score.reset();
			expect(press("C", 0, 180)?.judgment).toBe("good");

			score.reset();
			expect(press("C", 0, 181)).toBeNull();
		});

		it("judges early presses by the same windows", () => {
			expect(press("C", 0, -60)?.judgment).toBe("perfect");

			score.reset();
			expect(press("C", 0, -121)?.judgment).toBe("good");

			score.reset();
			expect(press("C", 0, -181)).toBeNull();
		});

		it("keeps the signed offset, so early reads negative", () => {
			expect(press("C", 0, -45)?.deltaMs).toBe(-45);
		});
	});

	describe("press matching", () => {
		it("takes the nearest open note, not the first one in range", () => {
			// 100 ms apart: a press 60 ms after the first note is only 40 ms
			// from the second.
			notes.set([note(0, "C"), note(0.1, "D")]);

			const judged = press("D", 0, 60);

			expect(judged?.note.name).toBe("D");
			expect(judged?.judgment).toBe("perfect");
			expect(judged?.deltaMs).toBe(-40);
		});

		it("kills the nearest note on a wrong pitch, not the matching one", () => {
			notes.set([note(0, "C"), note(0.1, "D")]);

			const judged = press("C", 0, 60);

			expect(judged?.note.name).toBe("D");
			expect(judged?.judgment).toBe("miss");
			expect(judged?.deltaMs).toBeNull();
			// The "C" it was aimed at is untouched and still playable.
			expect(score.judgmentFor(0)).toBeUndefined();
		});

		it("never judges the same note twice", () => {
			notes.set([note(0, "C")]);

			expect(press("C", 0, 0)?.judgment).toBe("perfect");
			expect(press("C", 0, 10)).toBeNull();
			expect(score.stats().totalNotes).toBe(1);
		});
	});

	describe("streak", () => {
		it("breaks on a wrong pitch, and the note counts as a miss", () => {
			notes.set([note(0, "C"), note(1, "D"), note(2, "E"), note(3, "F")]);
			press("C", 0, 0);
			press("D", 1, 0);
			expect(score.streak()).toBe(2);

			press("G", 2, 0);

			expect(score.streak()).toBe(0);
			expect(score.counts().miss).toBe(1);
			expect(score.judgmentFor(2)).toBe("miss");
		});

		it("breaks on a stray press but records nothing", () => {
			notes.set([note(0, "C"), note(1, "D")]);
			press("C", 0, 0);
			press("D", 1, 0);
			const before = score.stats();

			expect(score.judgePress("C", at(5))).toBeNull();

			expect(score.streak()).toBe(0);
			expect(score.stats().totalNotes).toBe(before.totalNotes);
			expect(score.counts().miss).toBe(0);
			expect(score.score()).toBe(before.score);
		});

		it("remembers the best run", () => {
			perfectRun(5);
			notes.update((current) => [...current, note(5, "C")]);
			press("D", 5, 0);

			expect(score.streak()).toBe(0);
			expect(score.maxStreak()).toBe(5);
		});
	});

	describe("multiplier", () => {
		it("starts at 1 and steps up every ten hits", () => {
			expect(score.multiplier()).toBe(1);

			perfectRun(9);
			expect(score.multiplier()).toBe(1);
		});

		it("reaches 2 on the tenth hit", () => {
			perfectRun(10);

			expect(score.streak()).toBe(10);
			expect(score.multiplier()).toBe(2);
		});

		it("caps at 4", () => {
			perfectRun(60);

			expect(score.streak()).toBe(60);
			expect(score.multiplier()).toBe(4);
		});

		it("collapses to 1 when the streak breaks", () => {
			perfectRun(20);
			expect(score.multiplier()).toBe(3);

			notes.update((current) => [...current, note(20, "C")]);
			press("D", 20, 0);

			expect(score.multiplier()).toBe(1);
		});
	});

	describe("points", () => {
		it("pays the multiplier the hit was earned at, not the one it earns", () => {
			// Ten perfects at x1; the tenth is what raises the multiplier, so
			// the eleventh is the first one paid at x2.
			perfectRun(10);
			expect(score.score()).toBe(1000);

			notes.update((current) => [...current, note(10, "C")]);
			press("C", 10, 0);

			expect(score.score()).toBe(1200);
		});

		it("pays each window its own base", () => {
			notes.set([note(0, "C"), note(1, "D"), note(2, "E"), note(3, "F")]);

			press("C", 0, 0); // perfect: 100
			press("D", 1, 100); // great:    75
			press("E", 2, 150); // good:     50
			press("G", 3, 0); // miss:       0

			expect(score.score()).toBe(225);
		});
	});

	describe("sweep", () => {
		it("misses a note only once it is past the window", () => {
			notes.set([note(0, "C")]);

			expect(score.sweep(at(0) + 180)).toEqual([]);
			expect(score.judgmentFor(0)).toBeUndefined();

			const missed = score.sweep(at(0) + 181);

			expect(missed).toHaveLength(1);
			expect(missed[0]?.judgment).toBe("miss");
			expect(missed[0]?.deltaMs).toBeNull();
			expect(score.judgmentFor(0)).toBe("miss");
		});

		it("leaves notes that are still coming alone", () => {
			notes.set([note(0, "C"), note(1, "D"), note(2, "E")]);

			const missed = score.sweep(at(1) + 200);

			expect(missed.map((entry) => entry.note.beat)).toEqual([0, 1]);
		});

		it("never re-judges a note it already retired", () => {
			notes.set([note(0, "C")]);
			score.sweep(at(0) + 500);

			expect(score.sweep(at(0) + 900)).toEqual([]);
			expect(score.counts().miss).toBe(1);
		});

		it("breaks the streak", () => {
			perfectRun(3);
			notes.update((current) => [...current, note(3, "C")]);

			score.sweep(at(3) + 500);

			expect(score.streak()).toBe(0);
			expect(score.maxStreak()).toBe(3);
		});
	});

	describe("stats", () => {
		it("reads zero before anything is judged", () => {
			expect(score.stats()).toEqual({
				score: 0,
				maxStreak: 0,
				counts: { perfect: 0, great: 0, good: 0, miss: 0 },
				totalNotes: 0,
				accuracy: 0,
			});
		});

		it("counts a good-or-better hit as accurate and a miss as not", () => {
			notes.set([note(0, "C"), note(1, "D"), note(2, "E"), note(3, "F")]);
			press("C", 0, 0);
			press("D", 1, 100);
			press("E", 2, 170);
			press("G", 3, 0);

			expect(score.stats()).toEqual({
				score: 225,
				maxStreak: 3,
				counts: { perfect: 1, great: 1, good: 1, miss: 1 },
				totalNotes: 4,
				accuracy: 75,
			});
		});

		it("reports accuracy to one decimal", () => {
			notes.set([note(0, "C"), note(1, "D"), note(2, "E")]);
			press("C", 0, 0);
			press("D", 1, 0);
			press("G", 2, 0);

			expect(score.stats().accuracy).toBe(66.7);
		});
	});

	it("exposes the last judgment for the popup", () => {
		notes.set([note(0, "C"), note(1, "D")]);
		expect(score.lastJudged()).toBeNull();

		press("C", 0, 0);
		expect(score.lastJudged()?.judgment).toBe("perfect");

		press("F", 1, 0);
		expect(score.lastJudged()?.judgment).toBe("miss");
	});

	describe("overlap accidentals", () => {
		it("accepts an enharmonic press when the flag is on", () => {
			score.overlapAccidentals.set(true);
			notes.set([note(0, "Db"), note(1, "E#")]);

			// The overlap layout has no Db key; the press arrives as C#.
			press("C#", 0, 0);
			expect(score.lastJudged()?.judgment).toBe("perfect");

			// E# has no key either; F is the same pitch.
			press("F", 1, 30);
			expect(score.lastJudged()?.judgment).toBe("perfect");
			expect(score.streak()).toBe(2);
		});

		it("still kills a non-equivalent press instantly", () => {
			score.overlapAccidentals.set(true);
			notes.set([note(0, "Db")]);

			press("D", 0, 0); // D is a different pitch from Db
			expect(score.lastJudged()?.judgment).toBe("miss");
		});

		it("requires the exact spelling when the flag is off", () => {
			notes.set([note(0, "Db")]);

			press("C#", 0, 0);
			expect(score.lastJudged()?.judgment).toBe("miss");
		});
	});

	it("bumps judgedVersion on every judgment, so the staff repaints", () => {
		notes.set([note(0, "C"), note(1, "D"), note(2, "E")]);
		expect(score.judgedVersion()).toBe(0);

		press("C", 0, 0); // hit
		expect(score.judgedVersion()).toBe(1);

		press("F", 1, 0); // wrong pitch, judged as a miss
		expect(score.judgedVersion()).toBe(2);

		score.sweep(at(2) + 500); // timeout miss
		expect(score.judgedVersion()).toBe(3);

		press("C", 2, 5000); // stray press: nothing judged, no bump
		expect(score.judgedVersion()).toBe(3);
	});

	it("clears everything on reset", () => {
		perfectRun(12);
		score.reset();

		expect(score.stats()).toEqual({
			score: 0,
			maxStreak: 0,
			counts: { perfect: 0, great: 0, good: 0, miss: 0 },
			totalNotes: 0,
			accuracy: 0,
		});
		expect(score.multiplier()).toBe(1);
		expect(score.lastJudged()).toBeNull();
		// A reset run may re-judge the notes still on screen.
		expect(score.judgmentFor(0)).toBeUndefined();
	});
});
