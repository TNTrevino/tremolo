import type { StaffClef } from "@shared/models/music.models";

import { CLEF_LABELS } from "../components/clef-glyph/clef-glyph.component";
import type { MultiChoiceSetting } from "../models/setting-descriptor.models";

/**
 * Descriptor presets shared by more than one game.
 *
 * Port of
 * frontend-react/src/features/identification-game/settings/presets.tsx.
 * It was a `.tsx` only because each option carried a `<ClefGlyph>` element;
 * under D9 the option carries `{ kind: "clef", clef }` and the file is a
 * `.ts` like every other definition-side module.
 */

const ALL_CLEFS = Object.keys(CLEF_LABELS) as StaffClef[];

/**
 * The shared "Clefs" multi-select, with clef-on-staff glyphs. Any game with
 * a `clefs: StaffClef[]` setting drops this into its schema.
 */
export function clefsSetting<S extends { clefs: StaffClef[] }>(
	clefs: StaffClef[] = ALL_CLEFS,
): MultiChoiceSetting<S> {
	return {
		kind: "multiChoice",
		key: "clefs" as keyof S & string,
		label: "Clefs",
		options: clefs.map((clef) => ({
			value: clef,
			label: CLEF_LABELS[clef],
			glyph: { kind: "clef", clef },
		})),
	};
}
