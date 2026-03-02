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

export interface FriendsStore {
	friends: Friend[];
	isPanelOpen: boolean;
	searchQuery: string;
	isLoading: boolean;
	error: string | null;
	togglePanel: () => void;
	setSearchQuery: (query: string) => void;
	filteredFriends: () => Friend[];
	fetchFriends: () => void;
	resetFriends: () => void;
}
