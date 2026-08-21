/**
 * Shared constants and helpers for identification games.
 *
 * Port of frontend-react/src/features/identification-game/utils.ts, plus the
 * two clef tables that used to sit in `ClefGlyphComponent`.
 *
 * This module holds **data only** -- no Angular, no components, no services,
 * and so no path to `opensheetmusicdisplay`. It is re-exported by `data.ts`
 * (the data-only entry point) and by the feature barrel, and the "shared
 * constants live once" invariant in `frontend/CLAUDE.md` means nothing
 * redeclares any of it.
 */

import type { StaffClef } from "@shared/models/music.models";

/** The seven natural note letters, low to high within an octave. */
export const NATURAL_NOTES = ["C", "D", "E", "F", "G", "A", "B"] as const;

/** Human-readable clef names, for settings chips and pickers. */
export const CLEF_LABELS: Record<StaffClef, string> = {
	treble: "Treble Clef",
	bass: "Bass Clef",
	alto: "Alto Clef",
	tenor: "Tenor Clef",
	soprano: "Soprano Clef",
	mezzo_soprano: "Mezzo-soprano Clef",
	baritone: "Baritone Clef",
};

/** Unicode codepoint per clef (shared by every staff renderer). */
export const CLEF_UNICODE: Record<StaffClef, string> = {
	treble: "\u{1D11E}",
	bass: "\u{1D122}",
	alto: "\u{1D121}",
	tenor: "\u{1D121}",
	soprano: "\u{1D121}",
	mezzo_soprano: "\u{1D121}",
	baritone: "\u{1D122}",
};

/** Format seconds as "HH:MM:SS" for the entries API. */
export function formatTimeLength(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	return [hours, minutes, secs]
		.map((val) => String(val).padStart(2, "0"))
		.join(":");
}
