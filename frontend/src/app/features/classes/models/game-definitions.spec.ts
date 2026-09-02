import { GAME_DEFINITIONS } from "@features/identification-game/data";

import type { GameType } from "../../../shared/models/game.models";
import {
	defaultAssignmentConfig,
	defaultGameSettings,
	GAME_TYPE_LABELS,
	GAME_TYPE_OPTIONS,
	GENERIC_GAME_TYPES,
	isGenericGameType,
	isKnownGameType,
	settingsSchemaFor,
	toAssignmentConfig,
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

	// The runtime half of the type union. `isGenericGameType` narrows a value
	// already known to be a `GameType`; this one is what a `game_type` string
	// off the wire has to pass first.
	it("recognises every known game type and nothing else", () => {
		for (const gameType of ALL_TYPES) {
			expect(isKnownGameType(gameType)).toBe(true);
		}

		expect(isKnownGameType("theremin")).toBe(false);
		expect(isKnownGameType("")).toBe(false);
		// Inherited object properties are not game types.
		expect(isKnownGameType("toString")).toBe(false);
		expect(isKnownGameType("constructor")).toBe(false);
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

/**
 * Added for issue #261: the assignment dialog now needs a settings object it
 * can hold and patch *before* freezing it, which is what split
 * `defaultAssignmentConfig` into these three. The composition invariant --
 * `defaultAssignmentConfig` is `toAssignmentConfig` run on
 * `defaultGameSettings` -- is the one thing every caller of the old function
 * still depends on, so it is asserted directly rather than just implied by
 * the two halves being separately correct.
 */
describe("defaultGameSettings / toAssignmentConfig / settingsSchemaFor", () => {
	const ALL_TYPES: GameType[] = [
		"note",
		"key_signature",
		"scale",
		"chord",
		"interval",
	];

	it("composes back into defaultAssignmentConfig for every game type", () => {
		for (const gameType of ALL_TYPES) {
			expect(
				toAssignmentConfig(gameType, defaultGameSettings(gameType)),
			).toEqual(defaultAssignmentConfig(gameType));
		}
	});

	it("hands back a fresh settings object each call, so patching one cannot leak", () => {
		const first = defaultGameSettings("scale");
		first["timeLimit"] = 999;

		expect(defaultGameSettings("scale")["timeLimit"]).toBe(60);
	});

	it("keeps the note game's settings camelCase, unlike the config it freezes into", () => {
		// Unlike `defaultAssignmentConfig`, the settings a teacher tunes are
		// camelCase even for the note game -- the snake_case conversion is
		// `toAssignmentConfig`'s job alone.
		expect(defaultGameSettings("note")).toMatchObject({
			gameMode: "time",
			timeLimit: 30,
			clef: "treble",
		});
		expect(defaultGameSettings("key_signature")).toMatchObject({
			gameMode: "time",
			timeLimit: 30,
			clefs: ["treble"],
		});
	});

	it("freezes a tuned note game settings object to the snake_case config shape", () => {
		const tuned = { ...defaultGameSettings("note"), scale: "G Major" };

		expect(toAssignmentConfig("note", tuned)).toMatchObject({
			scale: "G Major",
			game_mode: "time",
			time_limit: 30,
		});
	});

	it("freezes a tuned generic game settings object verbatim, as a fresh clone", () => {
		const tuned = {
			...defaultGameSettings("scale"),
			questionMode: "key_signature",
		};

		const frozen = toAssignmentConfig("scale", tuned);
		expect(frozen).toEqual(tuned);
		expect(frozen).not.toBe(tuned);
	});

	it("has no settings schema for the note game", () => {
		expect(settingsSchemaFor("note")).toBeNull();
	});

	it("hands back each generic game's own settings schema", () => {
		for (const gameType of GENERIC_GAME_TYPES) {
			expect(settingsSchemaFor(gameType)).toBe(
				GAME_DEFINITIONS[gameType].settingsSchema,
			);
		}
	});
});
