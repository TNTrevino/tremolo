import type { GameType } from "../../../shared/models/game.types";
import {
	defaultAssignmentConfig,
	GAME_TYPE_LABELS,
	GAME_TYPE_OPTIONS,
	GENERIC_GAME_TYPES,
	isGenericGameType,
} from "./game-definitions";

/**
 * Port of frontend-react/src/pages/AssignmentPlayPage.test.ts, which
 * despite its name tested `GENERIC_GAME_DEFINITIONS` -- the registry, not
 * the page.
 *
 * The registry's *values* (the four `GameDefinition` objects) are Phase 5
 * work, so what survives here is the part this slice owns: the type set,
 * the labels, and the frozen default configs. React's three assertions map
 * one for one -- every generic type is covered, `note` is deliberately not
 * a generic type, and each entry agrees with its key.
 */
describe("game type registry", () => {
	const ALL_TYPES: GameType[] = [
		"note",
		"key_signature",
		"scale",
		"chord",
		"interval",
	];

	it("covers every generic game type", () => {
		expect([...GENERIC_GAME_TYPES]).toEqual([
			"key_signature",
			"scale",
			"chord",
			"interval",
		]);
	});

	it("does not include the note game (it renders via its own page)", () => {
		expect(GENERIC_GAME_TYPES).not.toContain("note" as never);
		expect(isGenericGameType("note")).toBe(false);
	});

	it("labels every game type", () => {
		for (const gameType of ALL_TYPES) {
			expect(GAME_TYPE_LABELS[gameType]).toBeTruthy();
		}
	});

	it("offers one option per label, in the same order", () => {
		expect(GAME_TYPE_OPTIONS.map((o) => o.value)).toEqual(ALL_TYPES);
		expect(GAME_TYPE_OPTIONS.map((o) => o.label)).toEqual(
			ALL_TYPES.map((t) => GAME_TYPE_LABELS[t]),
		);
	});
});

describe("defaultAssignmentConfig", () => {
	it("gives every game type a non-empty config", () => {
		for (const gameType of [
			"note",
			"key_signature",
			"scale",
			"chord",
			"interval",
		] as GameType[]) {
			expect(
				Object.keys(defaultAssignmentConfig(gameType)).length,
			).toBeGreaterThan(0);
		}
	});

	it("hands back a fresh object each call, so patching one cannot leak", () => {
		const first = defaultAssignmentConfig("scale");
		first["timeLimit"] = 999;

		expect(defaultAssignmentConfig("scale")["timeLimit"]).toBe(60);
	});

	it("keeps the note game's config snake_case and the others' camelCase", () => {
		// The blob is stored verbatim and read back by the game that wrote it,
		// so this asymmetry is load-bearing -- the note game posts its config
		// straight at the music service.
		expect(defaultAssignmentConfig("note")).toMatchObject({
			game_mode: "time",
			time_limit: 30,
			clef: "treble",
		});
		expect(defaultAssignmentConfig("key_signature")).toMatchObject({
			gameMode: "time",
			timeLimit: 30,
			clefs: ["treble"],
		});
	});

	it("carries the key signature game's full 15-key default", () => {
		expect(defaultAssignmentConfig("key_signature")["keySignatures"]).toEqual([
			-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7,
		]);
	});
});
