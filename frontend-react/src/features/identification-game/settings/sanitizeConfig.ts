import { GameMode } from "@/shared/types";
import type { BaseGameSettings } from "../types";
import { TIME_LIMITS, NOTE_LIMITS } from "../types";
import type { SettingDescriptor } from "./types";

/**
 * Validate persisted settings JSON against a game's schema.
 *
 * Saved configs outlive code: fields get renamed, enum values change.
 * Only keys the schema (or the shared base settings) still knows, with
 * values that are still valid, survive; everything else falls back to
 * the defaults. Returns a patch to apply over the defaults.
 */
export function sanitizeConfig<S extends BaseGameSettings>(
	schema: SettingDescriptor<S>[],
	raw: Record<string, unknown>,
): Partial<S> {
	const patch: Record<string, unknown> = {};

	// Shared base settings
	if (raw.gameMode === GameMode.Time || raw.gameMode === GameMode.Notes) {
		patch.gameMode = raw.gameMode;
	}
	if ((TIME_LIMITS as readonly number[]).includes(raw.timeLimit as number)) {
		patch.timeLimit = raw.timeLimit;
	}
	if ((NOTE_LIMITS as readonly number[]).includes(raw.noteLimit as number)) {
		patch.noteLimit = raw.noteLimit;
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
