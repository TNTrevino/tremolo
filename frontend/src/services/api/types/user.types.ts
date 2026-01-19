/**
 * User Info Type Definitions
 *
 * Extended user information including statistics.
 * Used with the Go backend (port 5001).
 */

import type { UserRole } from "./auth.types";

export interface GeneralUserInfo {
	id: number;
	first_name: string;
	last_name: string;
	email: string;
	role: UserRole;
	created_at: string;
	total_sessions?: number;
	total_questions?: number;
	average_accuracy?: number;
	average_npm?: number;
}
