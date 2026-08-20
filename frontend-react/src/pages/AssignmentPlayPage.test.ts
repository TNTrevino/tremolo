import { describe, it, expect } from "vitest";
import {
	keySignatureGame,
	scaleGame,
	chordGame,
	intervalGame,
} from "@/features/identification-game";
import { GENERIC_GAME_DEFINITIONS } from "@/features/classes/gameDefinitions";

describe("GENERIC_GAME_DEFINITIONS", () => {
	it("maps each generic game type to its definition", () => {
		expect(GENERIC_GAME_DEFINITIONS.key_signature).toBe(keySignatureGame);
		expect(GENERIC_GAME_DEFINITIONS.scale).toBe(scaleGame);
		expect(GENERIC_GAME_DEFINITIONS.chord).toBe(chordGame);
		expect(GENERIC_GAME_DEFINITIONS.interval).toBe(intervalGame);
	});

	it("does not include the note game (it renders via NoteGamePage)", () => {
		expect(
			(GENERIC_GAME_DEFINITIONS as Record<string, unknown>).note,
		).toBeUndefined();
	});

	it("exposes each definition's gameType matching its key", () => {
		for (const [gameType, definition] of Object.entries(
			GENERIC_GAME_DEFINITIONS,
		)) {
			expect(definition.gameType).toBe(gameType);
		}
	});
});
