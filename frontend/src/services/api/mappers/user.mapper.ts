import type { ApiUser, User } from "../types";

export const mapApiUserToUser = (apiUser: ApiUser): User => ({
	id: apiUser.id,
	email: apiUser.email,
	firstName: apiUser.first_name,
	lastName: apiUser.last_name,
	role: apiUser.role,
});
