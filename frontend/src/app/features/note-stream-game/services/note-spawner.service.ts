import { Injectable, signal } from "@angular/core";

import {
	DEFAULT_RANGE,
	indexToNote,
	noteToIndex,
} from "@features/note-game/models/range.utils";
import {
	DEFAULT_NOTE_STREAM_SETTINGS,
	SPAWN_AHEAD_BEATS,
	type NoteStreamSettings,
	type StreamAccidental,
	type StreamNote,
} from "../models/note-stream.models";

/**
 * The endless supply of notes.
 *
 * There is no backend here. The music service generates MusicXML, and a
 * stream that spawns a note every beat forever would be one HTTP round trip
 * per beat for a single random pitch -- so the pitches are drawn locally,
 * from the same diatonic-index arithmetic the note game's range picker uses
 * (`note-game/models/range.utils.ts`). One note per integer beat, quarter
 * notes only: v1's whole rhythm model.
 *
 * **The buffer is filled ahead, never behind.** `ensureAhead` walks a
 * monotonic `nextBeat` cursor forward to `SPAWN_AHEAD_BEATS` past now, so
 * calling it every frame is idempotent and cheap, and a frame the browser
 * skipped cannot leave a hole in the stream. Notes leave the list only
 * through `prune`, which the game service calls once a judged note has
 * finished its animation -- the staff needs the note to keep drawing while
 * it fades.
 *
 * `random` is a field rather than a call to `Math.random`, so a spec can
 * feed it a sequence and assert on exact pitches.
 *
 * Provided per page, alongside the rest of the stream engine.
 */

/** How often an accidental is attached, when the setting allows any. */
const ACCIDENTAL_CHANCE = 0.3;

/** Re-rolls allowed before the repeat guard falls back to stepping the index. */
const MAX_REROLLS = 4;

@Injectable()
export class NoteSpawnerService {
	/** Injectable RNG, so a spec can spawn a known stream. */
	random: () => number = () => Math.random();

	private readonly _notes = signal<StreamNote[]>([]);

	/** Every note the staff should be drawing: unjudged, or judged and still fading. */
	readonly notes = this._notes.asReadonly();

	private settings: NoteStreamSettings = DEFAULT_NOTE_STREAM_SETTINGS;
	private nextId = 0;
	private nextBeat = 0;
	private previous: StreamNote | null = null;

	/** Starts a fresh stream. Everything spawned before this is dropped. */
	configure(settings: NoteStreamSettings): void {
		this.settings = settings;
		this.nextId = 0;
		this.nextBeat = 0;
		this.previous = null;
		this._notes.set([]);
	}

	/**
	 * Tops the buffer up so notes exist out to `SPAWN_AHEAD_BEATS` past the
	 * given beat. Safe to call every frame; safe to call with a negative
	 * beat, which is what the count-in does -- the first notes are already
	 * scrolling while the metronome counts.
	 */
	ensureAhead(currentBeat: number): void {
		const horizon = currentBeat + SPAWN_AHEAD_BEATS;
		if (this.nextBeat > horizon) return;

		const spawned: StreamNote[] = [];
		while (this.nextBeat <= horizon) {
			spawned.push(this.spawn(this.nextBeat));
			this.nextBeat += 1;
		}
		this._notes.update((notes) => [...notes, ...spawned]);
	}

	/** Drops notes by id, once they are done being drawn. */
	prune(ids: number[]): void {
		if (ids.length === 0) return;
		const dropped = new Set(ids);
		this._notes.update((notes) => notes.filter((n) => !dropped.has(n.id)));
	}

	/**
	 * One note for one beat.
	 *
	 * **No pitch repeats itself back to back.** Two identical notes in a row
	 * read as a stutter rather than as reading practice, and at a two-octave
	 * range a collision is common enough to notice. A few re-rolls clear it
	 * in every realistic case; the deterministic fallback -- step one staff
	 * position -- is what keeps a degenerate RNG (a spec's constant, say)
	 * from looping forever.
	 */
	private spawn(beat: number): StreamNote {
		let candidate = this.pick(beat);
		for (let i = 0; i < MAX_REROLLS && this.repeats(candidate); i++) {
			candidate = this.pick(beat);
		}
		if (this.repeats(candidate)) candidate = this.step(candidate);

		this.previous = candidate;
		this.nextId += 1;
		return candidate;
	}

	private pick(beat: number): StreamNote {
		const range = DEFAULT_RANGE[this.settings.clef];
		const low = noteToIndex(range.low);
		const high = noteToIndex(range.high);
		const diatonicIndex = low + Math.floor(this.random() * (high - low + 1));

		const accidental = this.pickAccidental();
		return {
			id: this.nextId,
			name: nameOf(diatonicIndex, accidental),
			diatonicIndex,
			accidental,
			beat,
		};
	}

	private pickAccidental(): StreamAccidental {
		if (!this.settings.accidentals) return null;
		if (this.random() >= ACCIDENTAL_CHANCE) return null;
		return this.random() < 0.5 ? "sharp" : "flat";
	}

	private repeats(candidate: StreamNote): boolean {
		const previous = this.previous;
		return (
			previous !== null &&
			previous.name === candidate.name &&
			previous.diatonicIndex === candidate.diatonicIndex
		);
	}

	/** One staff position up, wrapping to the bottom of the range. */
	private step(note: StreamNote): StreamNote {
		const range = DEFAULT_RANGE[this.settings.clef];
		const low = noteToIndex(range.low);
		const high = noteToIndex(range.high);
		const diatonicIndex =
			note.diatonicIndex >= high ? low : note.diatonicIndex + 1;
		return {
			...note,
			diatonicIndex,
			name: nameOf(diatonicIndex, note.accidental),
		};
	}
}

/**
 * The UI spelling of a pitch: the letter for a diatonic index, plus the
 * accidental's suffix.
 *
 * The octave is dropped on purpose. `noteKeyboardInput`'s map has 21 note
 * names and no octaves, so a press can only ever match by name -- the index
 * survives on the note for the staff's y position.
 */
function nameOf(diatonicIndex: number, accidental: StreamAccidental): string {
	const letter = indexToNote(diatonicIndex).replace(/[0-9]/g, "");
	if (accidental === "sharp") return `${letter}#`;
	if (accidental === "flat") return `${letter}b`;
	return letter;
}
