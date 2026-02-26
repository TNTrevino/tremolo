import { create } from "zustand";
import type { FriendsStore } from "@/features/friends/types";
import { mockFriends } from "@/features/friends/friends.mock";

export const useFriendsStore = create<FriendsStore>()((set, get) => ({
	friends: mockFriends,
	isPanelOpen: false,
	searchQuery: "",

	togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

	setSearchQuery: (query: string) => set({ searchQuery: query }),

	filteredFriends: () => {
		const { friends, searchQuery } = get();
		if (!searchQuery.trim()) return friends;
		const q = searchQuery.toLowerCase();
		return friends.filter(
			(f) =>
				f.firstName.toLowerCase().includes(q) ||
				f.lastName.toLowerCase().includes(q) ||
				f.instrument.toLowerCase().includes(q) ||
				f.school.toLowerCase().includes(q),
		);
	},
}));
