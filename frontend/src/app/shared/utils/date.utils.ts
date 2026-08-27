/**
 * Port of frontend-react/src/shared/utils/date.utils.ts, verbatim.
 *
 * Both helpers deliberately return `""` for a missing value so a template
 * can test the result for truthiness and skip rendering the separator that
 * would otherwise dangle (`· Due `).
 */

/**
 * Formats an ISO date string as e.g. "Jan 5, 2026" (short month, numeric
 * day/year, system locale). Returns "" for a missing or unparseable date
 * so callers can treat the result as falsy and skip rendering.
 */
export function formatDate(iso: string | null | undefined): string {
	if (!iso) return "";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

/**
 * Formats a date-only string ("YYYY-MM-DD") as e.g. "Jan 5" (short month,
 * numeric day, no year). Parses at local midnight so a date never slips to
 * the previous day in negative-offset timezones. Returns the raw input if
 * unparseable and "" if missing.
 */
export function formatShortDate(dateStr: string | null | undefined): string {
	if (!dateStr) return "";
	const date = new Date(`${dateStr}T00:00:00`);
	if (Number.isNaN(date.getTime())) return dateStr;
	return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * "Time reading" is an estimate, not a measurement: the Go service stores no
 * session duration, so React multiplied sessions by an assumed five minutes.
 * Carried over so the number on the dashboard does not silently change.
 */
export function formatTimeReading(totalSessions: number): string {
	const totalMinutes = totalSessions * 5;
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
