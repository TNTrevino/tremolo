/**
 * Shared helpers for identification games.
 */

/** The seven natural note letters, low to high within an octave. */
export const NATURAL_NOTES = ["C", "D", "E", "F", "G", "A", "B"] as const;

/** Format seconds as "HH:MM:SS" for the entries API. */
export function formatTimeLength(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	return [hours, minutes, secs]
		.map((val) => String(val).padStart(2, "0"))
		.join(":");
}
