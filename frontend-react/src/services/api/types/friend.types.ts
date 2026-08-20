import type { UserRole } from "./auth.types";

export interface FriendResponse {
	id: number;
	first_name: string;
	last_name: string;
	role: UserRole;
	instrument: string;
	avatar_url: string;
	school: string;
}
