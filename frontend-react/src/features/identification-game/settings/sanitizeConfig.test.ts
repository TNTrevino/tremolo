import { describe, it, expect } from "vitest";
import { GameMode } from "@/shared/types";
import type { BaseGameSettings } from "../types";
import type { SettingDescriptor } from "./types";
import { sanitizeConfig } from "./sanitizeConfig";

interface TestSettings extends BaseGameSettings {
	clefs: string[];
	mode: string;
	fancy: boolean;
}

const schema: SettingDescriptor<TestSettings>[] = [
	{
		kind: "multiChoice",
		key: "clefs",
		label: "Clefs",
		options: [
			{ value: "treble", label: "Treble" },
			{ value: "bass", label: "Bass" },
		],
	},
	{
		kind: "choice",
		key: "mode",
		label: "Mode",
		options: [
			{ value: "a", label: "A" },
			{ value: "b", label: "B" },
		],
	},
	{ kind: "toggle", key: "fancy", label: "Fancy" },
];

describe("sanitizeConfig", () => {
	it("keeps valid values", () => {
		const patch = sanitizeConfig<TestSettings>(schema, {
			gameMode: GameMode.Notes,
			timeLimit: 60,
			noteLimit: 50,
			clefs: ["bass"],
			mode: "b",
			fancy: true,
		});
		expect(patch).toEqual({
			gameMode: GameMode.Notes,
			timeLimit: 60,
			noteLimit: 50,
			clefs: ["bass"],
			mode: "b",
			fancy: true,
		});
	});

	it("drops unknown keys and invalid values", () => {
		const patch = sanitizeConfig<TestSettings>(schema, {
			gameMode: "sprint",
			timeLimit: 45,
			mode: "z",
			fancy: "yes",
			legacyField: 123,
		});
		expect(patch).toEqual({});
	});

	it("filters multi-choice values to known options", () => {
		const patch = sanitizeConfig<TestSettings>(schema, {
			clefs: ["bass", "alto", "tenor"],
		});
		expect(patch).toEqual({ clefs: ["bass"] });
	});

	it("drops multi-choice arrays with no valid entries", () => {
		const patch = sanitizeConfig<TestSettings>(schema, {
			clefs: ["alto"],
		});
		expect(patch).toEqual({});
	});

	it("ignores non-array multi-choice values", () => {
		const patch = sanitizeConfig<TestSettings>(schema, {
			clefs: "treble",
		});
		expect(patch).toEqual({});
	});
});
