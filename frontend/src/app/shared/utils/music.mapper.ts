/**
 * music21 <-> UI notation conversion.
 *
 * Port of frontend-react/src/services/api/mappers/music.mapper.ts, verbatim.
 *
 * The Python microservice speaks music21, which spells flats with "-"
 * ("B-"); the UI spells them with "b" ("Bb"). `MusicService` converts at
 * the API boundary so feature code only ever sees UI notation -- the
 * invariant `frontend/CLAUDE.md` states as "notation converts at the API
 * boundary only". Nothing outside `shared/services/music.service.ts` may
 * call either of these, and no component may re-convert.
 *
 * Both are single `replace` calls, and both are case-sensitive on purpose:
 * a natural "B" has no lowercase "b" to rewrite, so `toMusic21NoteName("B")`
 * is "B" and only "Bb" becomes "B-".
 */

/** Wire -> UI: "E-" becomes "Eb". */
export const fromMusic21NoteName = (name: string): string =>
	name.replace("-", "b");

/** UI -> wire: "Eb" becomes "E-". */
export const toMusic21NoteName = (name: string): string =>
	name.replace("b", "-");
