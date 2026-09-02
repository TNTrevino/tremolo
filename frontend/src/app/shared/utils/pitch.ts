/**
 * Pitch-class equality for the 21 UI note names.
 *
 * Every comparison in the app is otherwise a *spelling* comparison:
 * `GameStateService` asks `guess === correctAnswer`, and the stream game asks
 * `target.note.name === name`. That is right when every note has a key of its
 * own. It is wrong under `overlap_accidentals` -- the piano-shaped keyboard
 * layout, where the five black-key slots are the only accidentals with a key
 * and a player shown a "Db" can press nothing but the C# key.
 *
 * So this module answers the other question: do two note names name the same
 * *sound*? The names are the UI's, with "b" flats
 * (`shared/utils/music.mapper.ts` has already converted away from music21's
 * "-"), and they carry no octave, because the key map has none either.
 *
 * The table lists all 21 spellings rather than deriving a pitch from a letter
 * plus an accidental: `Cb` and `B#` wrap the octave, and a derivation would
 * have to special-case the wrap anyway.
 */

/** UI note name -> pitch class, 0 = C. `Cb` wraps down to B, `B#` up to C. */
export const PITCH_CLASSES: Readonly<Record<string, number>> = {
	C: 0,
	"B#": 0,
	"C#": 1,
	Db: 1,
	D: 2,
	"D#": 3,
	Eb: 3,
	E: 4,
	Fb: 4,
	"E#": 5,
	F: 5,
	"F#": 6,
	Gb: 6,
	G: 7,
	"G#": 8,
	Ab: 8,
	A: 9,
	"A#": 10,
	Bb: 10,
	B: 11,
	Cb: 11,
};

/** The pitch class of a UI note name, or `undefined` if it is not one. */
export function pitchClass(note: string): number | undefined {
	return PITCH_CLASSES[note];
}

/**
 * Whether two note names sound the same.
 *
 * **An exact spelling match is always true**, including for a name the table
 * does not know: callers hand this whatever the game generated, and an
 * unrecognised spelling must not end up *less* equal to itself than it was
 * under `===`. Two *different* unknown names are not equivalent -- there is
 * no pitch to compare them at.
 */
export function notesEquivalent(a: string, b: string): boolean {
	if (a === b) return true;

	const pitchA = PITCH_CLASSES[a];
	return pitchA !== undefined && pitchA === PITCH_CLASSES[b];
}
