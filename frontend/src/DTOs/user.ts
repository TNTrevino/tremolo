/**
 * User Data Transfer Objects
 * Type definitions for user-related API responses
 */

/**
 * General user information response
 * Contains high-level user stats and account details
 */
export interface GeneralUserInfo {
	/** User's first name */
	first_name: string;
	/** User's last name */
	last_name: string;
	/** Formatted join date (e.g., "Joined 12 Mar 2024") */
	created_date: string;
	/** Total number of note game entries/sessions */
	total_entries: number;
	/** Total duration of gameplay (formatted string, e.g., "2h 15m") */
	total_duration: string;
}
