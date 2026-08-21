/**
 * Port of frontend-react/src/services/api/types/user.types.ts.
 *
 * The Go "user tracking" service answers `/api/users/:id/general-info` in
 * snake_case (`GeneralUserInfo`); everything inside the app speaks camelCase
 * (`UserProfile`). `mapGeneralUserInfo` in `shared/utils/user.mapper.ts` is
 * the only crossing point (PLAN.md 5.1).
 *
 * This is the *profile* user -- the one carrying lifetime statistics. The
 * session user (`auth/models/auth.models.ts`) is a different, smaller shape
 * that the login response carries; the two are deliberately not merged,
 * exactly as in React.
 */

import type { UserRole } from "../../auth/models/auth.models";

/** Wire shape of `GET /api/users/:id/general-info`. */
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

/** Domain shape. Every statistic is optional: a brand-new account has none. */
export interface UserProfile {
	id: number;
	firstName: string;
	lastName: string;
	email: string;
	role: UserRole;
	createdAt: string;
	totalSessions?: number;
	totalQuestions?: number;
	averageAccuracy?: number;
	averageNPM?: number;
}
