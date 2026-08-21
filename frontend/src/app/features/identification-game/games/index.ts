/**
 * Registry of identification game definitions.
 *
 * To add a game: write its definition module (settings schema, fetch
 * mapping, answers), add it here, create a thin page component, and
 * register the route + nav link. The Python microservice needs a matching
 * endpoint, and the Go `dtos.ValidGameTypes` map plus the TS `GameType`
 * union (`@shared/models/game.models`) need the new identifier.
 *
 * Port of frontend-react/src/features/identification-game/games/index.ts.
 * `GAME_DEFINITIONS` is new: the classes feature needs to look a definition
 * up by its `gameType` -- for the assignment host and for the default
 * config a new assignment starts from -- and a lookup table is the one
 * place that mapping should live.
 */

import type { SettingsGameType } from "@shared/models/game.models";

import type {
	BaseGameSettings,
	GeneratedQuestion,
} from "../models/game-state.models";
import type { GameDefinition } from "../models/game-definition.models";
import { chordGame } from "./chord.game";
import { intervalGame } from "./interval.game";
import { keySignatureGame } from "./key-signature.game";
import { scaleGame } from "./scale.game";

export { chordGame, type ChordGameSettings } from "./chord.game";
export { intervalGame, type IntervalGameSettings } from "./interval.game";
export {
	keySignatureGame,
	type KeySignatureGameSettings,
} from "./key-signature.game";
export { scaleGame, type ScaleGameSettings } from "./scale.game";

/**
 * A definition with its type parameters erased.
 *
 * Only a *lookup* needs this: the four definitions have four different
 * `T`/`S`/`Req` triples, so a `Record` over them cannot be typed any other
 * way. Every consumer that knows which game it is holding keeps the precise
 * type -- the game pages bind their own constant, and only the assignment
 * host (which resolves a game type at runtime) reads the table.
 */
export type AnyGameDefinition = GameDefinition<
	GeneratedQuestion,
	BaseGameSettings,
	never
>;

export const GAME_DEFINITIONS: Record<SettingsGameType, AnyGameDefinition> = {
	key_signature: keySignatureGame as unknown as AnyGameDefinition,
	scale: scaleGame as unknown as AnyGameDefinition,
	chord: chordGame as unknown as AnyGameDefinition,
	interval: intervalGame as unknown as AnyGameDefinition,
};
