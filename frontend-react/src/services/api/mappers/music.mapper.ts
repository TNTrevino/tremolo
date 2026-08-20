/**
 * music21 <-> UI notation conversion.
 *
 * The Python microservice speaks music21, which spells flats with "-"
 * ("B-"); the UI spells them with "b" ("Bb"). MusicService converts at
 * the API boundary so feature code only ever sees UI notation.
 */

export const fromMusic21NoteName = (name: string): string =>
	name.replace("-", "b");

export const toMusic21NoteName = (name: string): string =>
	name.replace("b", "-");
