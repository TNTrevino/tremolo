import type { ApiUser, User, GeneralUserInfo, UserProfile } from "../types";

export const mapApiUserToUser = (apiUser: ApiUser): User => ({
	id: apiUser.id,
	email: apiUser.email,
	firstName: apiUser.first_name,
	lastName: apiUser.last_name,
	role: apiUser.role,
	hasGoogle: apiUser.has_google ?? false,
});

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
