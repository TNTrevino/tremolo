import type { ApiUser, User } from "./auth.models";

/**
 * Ported from frontend-react/src/services/api/mappers/user.mapper.ts.
 * Plain function, no framework in it (PLAN.md 5.1).
 */
export const mapApiUserToUser = (apiUser: ApiUser): User => ({
	id: apiUser.id,
	email: apiUser.email,
	firstName: apiUser.first_name,
	lastName: apiUser.last_name,
	role: apiUser.role,
	hasGoogle: apiUser.has_google ?? false,
	emailVerified: apiUser.email_verified ?? false,
});
