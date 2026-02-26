export interface Friend {
	id: number;
	firstName: string;
	lastName: string;
	role: "student" | "teacher";
	instrument: string;
	avatarUrl: string;
	school: string;
}

export interface FriendsState {
	friends: Friend[];
	isPanelOpen: boolean;
	searchQuery: string;
	togglePanel: () => void;
	setSearchQuery: (query: string) => void;
	filteredFriends: () => Friend[];
}
