import {
	GameMode,
	NOTE_LIMITS,
	TIME_LIMITS,
	type BaseGameSettings,
} from "../models/game-state.models";
import type { SettingDescriptor } from "../models/setting-descriptor.models";

/**
 * Validate persisted settings JSON against a game's schema.
 *
 * Saved configs outlive code: fields get renamed, enum values change.
 * Only keys the schema (or the shared base settings) still knows, with
 * values that are still valid, survive; everything else falls back to
 * the defaults. Returns a patch to apply over the defaults.
 *
 * Verbatim port of
 * frontend-react/src/features/identification-game/settings/sanitizeConfig.ts
 * -- body unchanged line for line, and its test is ported with it. This is
 * the only thing standing between a five-year-old JSONB blob and a fetcher
 * that would fail on every question, so it is not a place to improvise.
 */
export function sanitizeConfig<S extends BaseGameSettings>(
	schema: SettingDescriptor<S>[],
	raw: Record<string, unknown>,
): Partial<S> {
	const patch: Record<string, unknown> = {};

	// Shared base settings
	if (raw["gameMode"] === GameMode.Time || raw["gameMode"] === GameMode.Notes) {
		patch["gameMode"] = raw["gameMode"];
	}
	if ((TIME_LIMITS as readonly number[]).includes(raw["timeLimit"] as number)) {
		patch["timeLimit"] = raw["timeLimit"];
	}
	if ((NOTE_LIMITS as readonly number[]).includes(raw["noteLimit"] as number)) {
		patch["noteLimit"] = raw["noteLimit"];
	}

	for (const descriptor of schema) {
		const value = raw[descriptor.key];
		if (value === undefined) continue;

		switch (descriptor.kind) {
			case "choice":
				if (descriptor.options.some((o) => o.value === value)) {
					patch[descriptor.key] = value;
				}
				break;
			case "multiChoice": {
				if (!Array.isArray(value)) break;
				const valid = descriptor.options
					.map((o) => o.value)
					.filter((v) => value.includes(v));
				if (valid.length > 0) {
					patch[descriptor.key] = valid;
				}
				break;
			}
			case "toggle":
				if (typeof value === "boolean") {
					patch[descriptor.key] = value;
				}
				break;
		}
	}

	return patch as Partial<S>;
}
