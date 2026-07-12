import {
	keySignatureGame,
	scaleGame,
	chordGame,
	intervalGame,
	type BaseGameSettings,
	type GeneratedQuestion,
} from "@/features/identification-game";
import type { GameDefinition } from "@/features/identification-game/games/types";
import type { GameType } from "@/services/api/types";

export type GenericGameType = Exclude<GameType, "note">;

/** A game definition with its specifics erased for uniform storage/rendering. */
type AnyGameDefinition = GameDefinition<GeneratedQuestion, BaseGameSettings>;

/**
 * Lookup from a generic game type to its declarative definition. The note
 * game is intentionally absent — it renders through NoteGamePage, not the
 * identification shell.
 *
 * Each entry's real type parameters (its question/settings shapes) are
 * erased to the shared `AnyGameDefinition` shape once, here, so callers
 * needing uniform storage/rendering across game types don't each redo the
 * `as unknown as` cast.
 */
export const GENERIC_GAME_DEFINITIONS: Record<
	GenericGameType,
	AnyGameDefinition
> = {
	key_signature: keySignatureGame as unknown as AnyGameDefinition,
	scale: scaleGame as unknown as AnyGameDefinition,
	chord: chordGame as unknown as AnyGameDefinition,
	interval: intervalGame as unknown as AnyGameDefinition,
};

export const GAME_TYPE_LABELS: Record<GameType, string> = {
	note: "Note",
	key_signature: "Key Signature",
	scale: "Scale",
	chord: "Chord",
	interval: "Interval",
};

export const GAME_TYPE_OPTIONS: { value: GameType; label: string }[] =
	Object.entries(GAME_TYPE_LABELS).map(([value, label]) => ({
		value: value as GameType,
		label,
	}));
