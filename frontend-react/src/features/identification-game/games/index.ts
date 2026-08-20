/**
 * Registry of identification game definitions.
 *
 * To add a game: write its definition module (settings schema, fetch
 * mapping, answers), add it here, create a thin page component, and
 * register the route + nav link. The Python microservice needs a
 * matching endpoint, and the Go dtos.ValidGameTypes map plus the TS
 * GameType union need the new identifier.
 */

export { defineGame, type GameDefinition } from "./types";
export {
	keySignatureGame,
	type KeySignatureGameSettings,
} from "./keySignature";
export { scaleGame, type ScaleGameSettings } from "./scale";
export { chordGame, type ChordGameSettings } from "./chord";
export { intervalGame, type IntervalGameSettings } from "./interval";
