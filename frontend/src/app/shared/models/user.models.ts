import type { UserRole } from "../../auth/models/auth.models";

/**
 * `GET /api/users/:userId/general-info` -- the user's name, join date and
 * aggregate practice totals.
 *
 * Port of frontend-react/src/services/api/types/user.types.ts, **corrected
 * against the Go service** (R5: the repo beats the plan, and a running
 * service beats a stale type). React's `GeneralUserInfo` declared ten
 * fields; `backend/main/DTOs/general_user_info_dto.go` serialises six, and
 * only these six ever arrive:
 *
 * | React claimed      | Go sends                                   |
 * | ------------------ | ------------------------------------------ |
 * | `first_name`       | yes                                        |
 * | `last_name`        | yes                                        |
 * | `role`             | yes                                        |
 * | `created_at`       | **no** -- it is `created_date`, and it is  |
 * |                    | pre-formatted "Joined 12 Mar 2024"         |
 * | `id`, `email`      | **no**                                     |
 * | `total_sessions`   | **no** -- the count is `total_entries`     |
 * | `total_questions`  | **no**                                     |
 * | `average_accuracy` | **no**                                     |
 * | `average_npm`      | **no**                                     |
 * | --                 | `total_duration`, "HH:MM:SS"               |
 *
 * The four missing stats were optional in React and read as
 * `userProfile.totalSessions ?? 0` by `useDashboardData`, so the dashboard
 * has always shown four zeroes; `createdAt` was not optional and
 * `UserProfileCard` renders `new Date(undefined)`. Both are live React
 * bugs, not migration damage. They are typed away here rather than carried
 * across as fields that are permanently `undefined`: a compile error tells
 * the dashboard builder immediately, where a silent `undefined` did not
 * tell anyone for a year. See phase-3-subfeature-3-handoff.md.
 */
export interface GeneralUserInfoDto {
	first_name: string;
	last_name: string;
	role: UserRole;
	/** Pre-formatted by the Go service: `"Joined 12 Mar 2024"`. Not an ISO date. */
	created_date: string;
	/** Recorded game entries, across every game type. */
	total_entries: number;
	/** `"HH:MM:SS"`. */
	total_duration: string;
}

export interface UserProfile {
	firstName: string;
	lastName: string;
	role: UserRole;
	/** Already human-readable: `"Joined 12 Mar 2024"`. Do not pass to `new Date()`. */
	createdDate: string;
	totalEntries: number;
	/** `"HH:MM:SS"`. */
	totalDuration: string;
}

export const mapGeneralUserInfo = (dto: GeneralUserInfoDto): UserProfile => ({
	firstName: dto.first_name,
	lastName: dto.last_name,
	role: dto.role,
	createdDate: dto.created_date,
	totalEntries: dto.total_entries,
	totalDuration: dto.total_duration,
});
