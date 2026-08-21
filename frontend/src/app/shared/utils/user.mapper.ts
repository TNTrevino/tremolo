import type { GeneralUserInfo, UserProfile } from "../models/user.models";

/**
 * Ported from frontend-react/src/services/api/mappers/user.mapper.ts
 * (`mapGeneralUserInfo`). Plain function, no framework in it (PLAN.md 5.1).
 *
 * `mapApiUserToUser` -- the *session* user's mapper -- is a different
 * function on a different type and lives with the auth models.
 */
export const mapGeneralUserInfo = (info: GeneralUserInfo): UserProfile => ({
	id: info.id,
	firstName: info.first_name,
	lastName: info.last_name,
	email: info.email,
	role: info.role,
	createdAt: info.created_at,
	totalSessions: info.total_sessions,
	totalQuestions: info.total_questions,
	averageAccuracy: info.average_accuracy,
	averageNPM: info.average_npm,
});
