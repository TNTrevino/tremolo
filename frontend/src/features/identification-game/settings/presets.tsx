import type { StaffClef } from "@/services/api/types";
import { ClefGlyph, CLEF_LABELS } from "../components/ClefGlyph";
import type { MultiChoiceSetting } from "./types";

const ALL_CLEFS = Object.keys(CLEF_LABELS) as StaffClef[];

/**
 * Shared "Clefs" multi-select with clef-on-staff glyphs. Any game with
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
			render: <ClefGlyph clef={clef} />,
		})),
	};
}
