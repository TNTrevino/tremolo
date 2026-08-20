/**
 * Date formatting utilities
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
