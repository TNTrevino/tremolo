import type { UserRole } from "@/services/api/types";

export interface Friend {
	id: number;
	firstName: string;
	lastName: string;
	role: UserRole;
	instrument: string;
	avatarUrl: string;
	school: string;
}

export interface FriendsUIStore {
	isPanelOpen: boolean;
	searchQuery: string;
	togglePanel: () => void;
	setSearchQuery: (query: string) => void;
}
