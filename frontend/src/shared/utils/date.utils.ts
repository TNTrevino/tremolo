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
