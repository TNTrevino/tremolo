import { computed, inject, Injectable, signal } from "@angular/core";

import {
	HIT_WINDOWS_MS,
	JUDGMENT_POINTS,
	MAX_MULTIPLIER,
	MISS_WINDOW_MS,
	STREAK_PER_MULTIPLIER,
	type NoteJudged,
	type NoteStreamStats,
	type StreamJudgment,
	type StreamNote,
} from "../models/note-stream.models";
import { notesEquivalent } from "../../../shared/utils/pitch";
import { NoteSpawnerService } from "./note-spawner.service";
import { StreamTransportService } from "./stream-transport.service";

/**
 * Judgment and score. No DOM, no audio, no timers -- the two things it
 * reads, the beat grid and the live notes, both arrive by injection, so a
 * spec can drive the whole scoring model with a fake clock and a handful of
 * notes.
 *
 * **A press matches the nearest open note, not the first one.** At 120 BPM
 * two notes are 500 ms apart and the ±180 ms windows never overlap, but at
 * the top of the tempo range they are close enough that "first in the list
 * within the window" would credit a press to the note the player had
 * already left behind. Nearest is also what a player means.
 *
 * **A wrong pitch kills the note it was aimed at.** That is the anti-mash
 * rule from the design record: without it, hammering every key in the row
 * guarantees a Perfect on every note. A press with nothing in range is
 * different -- it costs the streak, but records nothing, because there is no
 * note to record it against and inflating the miss count would wreck the
 * accuracy figure.
 *
 * **The multiplier is read before the streak advances.** The hit that takes
 * the streak from 9 to 10 is scored at ×1; the next one is the first at ×2.
 * The alternative pays the bonus for a streak the player has not finished
 * earning yet.
 *
 * Judged notes live in a plain `Map`, not a signal: `judgmentFor` is read
 * per note per frame by the staff's `requestAnimationFrame` loop, which is
 * already redrawing everything and has no use for reactivity. The one
 * reactive consumer -- the staff *template*, which colours a judged note --
 * tracks `judgedVersion` instead: the map itself stays cheap, and the bump
 * per judgment is what repaints the flash on the frame it happened rather
 * than whenever the note list next changes (up to a whole beat later).
 *
 * Provided per page, alongside the rest of the stream engine.
 */

const NO_COUNTS: Record<StreamJudgment, number> = {
	perfect: 0,
	great: 0,
	good: 0,
	miss: 0,
};

@Injectable()
export class StreamScoreService {
	private readonly transport = inject(StreamTransportService);
	private readonly spawner = inject(NoteSpawnerService);

	private readonly judged = new Map<number, NoteJudged>();

	private readonly _score = signal(0);
	private readonly _streak = signal(0);
	private readonly _maxStreak = signal(0);
	private readonly _counts = signal<Record<StreamJudgment, number>>(NO_COUNTS);
	private readonly _lastJudged = signal<NoteJudged | null>(null);
	private readonly _judgedVersion = signal(0);

	readonly score = this._score.asReadonly();
	readonly streak = this._streak.asReadonly();
	readonly maxStreak = this._maxStreak.asReadonly();
	readonly counts = this._counts.asReadonly();

	/** The most recent judgment, for the popup above the hit line. */
	readonly lastJudged = this._lastJudged.asReadonly();

	/**
	 * Bumped once per recorded judgment. A `judgmentFor` wrapper that reads
	 * this before the map lookup gives a template a reason to re-render the
	 * instant a note is judged -- see the class doc.
	 */
	readonly judgedVersion = this._judgedVersion.asReadonly();

	/**
	 * The bindings' overlap_accidentals flag. In the overlap layout a
	 * pressed name only has to be the same PITCH as the target -- a C#
	 * press clears a Db note -- because the nine enharmonic-only
	 * spellings have no key of their own there. Lives here rather than
	 * on the game service because the game service injects this one.
	 */
	readonly overlapAccidentals = signal(false);

	readonly multiplier = computed(() =>
		Math.min(
			MAX_MULTIPLIER,
			1 + Math.floor(this._streak() / STREAK_PER_MULTIPLIER),
		),
	);

	/**
	 * Judges one key press against the stream.
	 *
	 * `timeStampMs` is the keydown event's own `timeStamp`, on the
	 * `performance.now()` timeline the transport lays its beats out on.
	 * Returns `null` for a press with no note in range.
	 */
	judgePress(name: string, timeStampMs: number): NoteJudged | null {
		const target = this.nearestOpenNote(timeStampMs);

		if (!target) {
			// A stray press breaks the streak and nothing else.
			this._streak.set(0);
			return null;
		}

		const matches = this.overlapAccidentals()
			? notesEquivalent(target.note.name, name)
			: target.note.name === name;
		if (!matches) {
			return this.record(target.note, "miss", null);
		}

		return this.record(
			target.note,
			judgmentForDelta(Math.abs(target.deltaMs)),
			target.deltaMs,
		);
	}

	/**
	 * Retires every open note whose moment has passed. Called once a frame;
	 * a note is only a miss once it is *past* the window, so a note sitting
	 * exactly on +180 ms is still playable.
	 */
	sweep(nowMs: number): NoteJudged[] {
		const missed: NoteJudged[] = [];

		for (const note of this.spawner.notes()) {
			if (this.judged.has(note.id)) continue;
			if (nowMs - this.transport.beatToTimeMs(note.beat) > MISS_WINDOW_MS) {
				missed.push(this.record(note, "miss", null));
			}
		}

		return missed;
	}

	/** How a note was judged, or `undefined` while it is still open. */
	judgmentFor(id: number): StreamJudgment | undefined {
		return this.judged.get(id)?.judgment;
	}

	stats(): NoteStreamStats {
		const counts = this._counts();
		const totalNotes =
			counts.perfect + counts.great + counts.good + counts.miss;
		const hits = counts.perfect + counts.great + counts.good;

		return {
			score: this._score(),
			maxStreak: this._maxStreak(),
			counts,
			totalNotes,
			accuracy:
				totalNotes === 0 ? 0 : Math.round((hits / totalNotes) * 1000) / 10,
		};
	}

	/** Clears everything for a new run. */
	reset(): void {
		this.judged.clear();
		this._judgedVersion.update((v) => v + 1);
		this._score.set(0);
		this._streak.set(0);
		this._maxStreak.set(0);
		this._counts.set(NO_COUNTS);
		this._lastJudged.set(null);
	}

	private nearestOpenNote(
		timeStampMs: number,
	): { note: StreamNote; deltaMs: number } | null {
		let best: { note: StreamNote; deltaMs: number } | null = null;

		for (const note of this.spawner.notes()) {
			if (this.judged.has(note.id)) continue;

			const deltaMs = timeStampMs - this.transport.beatToTimeMs(note.beat);
			if (Math.abs(deltaMs) > MISS_WINDOW_MS) continue;
			if (!best || Math.abs(deltaMs) < Math.abs(best.deltaMs)) {
				best = { note, deltaMs };
			}
		}

		return best;
	}

	private record(
		note: StreamNote,
		judgment: StreamJudgment,
		deltaMs: number | null,
	): NoteJudged {
		const entry: NoteJudged = { note, judgment, deltaMs };
		this.judged.set(note.id, entry);
		this._judgedVersion.update((v) => v + 1);
		this._counts.update((counts) => bump(counts, judgment));

		if (judgment === "miss") {
			this._streak.set(0);
		} else {
			this._score.update(
				(s) => s + JUDGMENT_POINTS[judgment] * this.multiplier(),
			);
			const streak = this._streak() + 1;
			this._streak.set(streak);
			this._maxStreak.update((max) => Math.max(max, streak));
		}

		this._lastJudged.set(entry);
		return entry;
	}
}

/** The window a press offset falls in. `HIT_WINDOWS_MS` is the source of truth. */
function judgmentForDelta(absDeltaMs: number): StreamJudgment {
	if (absDeltaMs <= HIT_WINDOWS_MS.perfect) return "perfect";
	if (absDeltaMs <= HIT_WINDOWS_MS.great) return "great";
	if (absDeltaMs <= HIT_WINDOWS_MS.good) return "good";
	return "miss";
}

/** A copy of the counts with one bumped -- typed, unlike a computed-key spread. */
function bump(
	counts: Record<StreamJudgment, number>,
	judgment: StreamJudgment,
): Record<StreamJudgment, number> {
	const next = { ...counts };
	next[judgment] += 1;
	return next;
}
