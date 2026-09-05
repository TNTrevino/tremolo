/**
 * Shared types and constants for the note stream game.
 *
 * The game is frontend-only in v1: no persistence, no music-api call. The
 * design record is docs/superpowers/specs/2026-08-30-note-stream-game-design.md.
 *
 * Everything time-related is expressed in **beats** on the transport
 * timeline (beat 0 is the first note's beat; the count-in occupies negative
 * beats) or in **milliseconds** on the `performance.now()` clock. Nothing
 * here touches `Date.now()`.
 */

import type { RangeClef } from "../../../shared/models/music.models";

/** Timing judgment for one note, ordered best to worst. */
export type StreamJudgment = "perfect" | "great" | "good" | "miss";

/** Accidental carried by a stream note. Naturals carry `null`. */
export type StreamAccidental = "sharp" | "flat" | null;

/**
 * One scrolling note. Plain data — the spawner creates it, the score
 * service judges it, the staff component draws it.
 */
export interface StreamNote {
	/** Unique per session, monotonically increasing. */
	id: number;
	/**
	 * Pitch name in UI spelling ("F#", "Bb", "C") — exactly what a key
	 * press from `noteKeyboardInput` must match. No octave: the key map
	 * has none, so matching is by name, like the note game.
	 */
	name: string;
	/**
	 * Diatonic index of the letter+octave (C0 = 0, one step per staff
	 * position — see note-game/models/range.utils.ts). Drives the y
	 * position on the staff.
	 */
	diatonicIndex: number;
	accidental: StreamAccidental;
	/** The beat this note should be played on. */
	beat: number;
}

/** The outcome of judging one note. */
export interface NoteJudged {
	note: StreamNote;
	judgment: StreamJudgment;
	/**
	 * Signed press offset in ms (negative = early). `null` when the note
	 * timed out with no press or was killed by a wrong-pitch press.
	 */
	deltaMs: number | null;
}

/** Session phase, owned by NoteStreamGameService. */
export type StreamPhase =
	"ready" | "countIn" | "playing" | "paused" | "finished";

/** In-memory settings (v1 has no persistence). */
export interface NoteStreamSettings {
	clef: RangeClef;
	tempoBpm: number;
	/** When true the spawner may add sharps and flats. */
	accidentals: boolean;
	sessionSeconds: number;
}

export const DEFAULT_NOTE_STREAM_SETTINGS: NoteStreamSettings = {
	clef: "treble",
	tempoBpm: 60,
	accidentals: false,
	sessionSeconds: 60,
};

/** Tempo chips offered by the settings panel. */
export const TEMPO_CHOICES = [30, 45, 60, 90, 120] as const;

/** Session length chips (seconds). */
export const SESSION_LENGTHS = [30, 60, 120] as const;

/**
 * Hit windows in ms around the note's beat time, per the spec. Fixed for
 * every tempo in v1; a BPM-proportional window is recorded future work.
 */
export const HIT_WINDOWS_MS: Record<Exclude<StreamJudgment, "miss">, number> = {
	perfect: 60,
	great: 120,
	good: 180,
};

/** A press only matches a note within this window; past it, the note is a miss. */
export const MISS_WINDOW_MS = HIT_WINDOWS_MS.good;

/** Base points per judgment, before the multiplier. */
export const JUDGMENT_POINTS: Record<StreamJudgment, number> = {
	perfect: 100,
	great: 75,
	good: 50,
	miss: 0,
};

/** Every 10 consecutive hits raise the multiplier by 1 ... */
export const STREAK_PER_MULTIPLIER = 10;
/** ... up to this cap, where the streak flame turns blue. */
export const MAX_MULTIPLIER = 4;

/** Beats of metronome count-in before the first note (also on resume). */
export const COUNT_IN_BEATS = 4;

/**
 * Beats in a bar. The metronome accents beat 1 and the staff's beat dots
 * count the same bar, so the accented click and the brass dot are one event
 * rather than two things that happen to agree.
 */
export const BEATS_PER_BAR = 4;

/** The spawner keeps the buffer filled this many beats ahead of now. */
export const SPAWN_AHEAD_BEATS = 10;

/** Horizontal spacing of the scroll, in px per beat. */
export const PIXELS_PER_BEAT = 140;

/** End-of-session stats for the results screen. */
export interface NoteStreamStats {
	score: number;
	maxStreak: number;
	counts: Record<StreamJudgment, number>;
	totalNotes: number;
	/** Percent of judged notes that were good or better. */
	accuracy: number;
}
