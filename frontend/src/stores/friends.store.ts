import { create } from "zustand";
import type { FriendsStore } from "@/features/friends/types";
import { friendsService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

export const useFriendsStore = create<FriendsStore>()((set, get) => ({
	friends: [],
	isPanelOpen: false,
	searchQuery: "",
	isLoading: false,
	error: null,

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

	fetchFriends: async () => {
		set({ isLoading: true, error: null });
		try {
			const friends = await friendsService.getFriends();
			set({ friends, isLoading: false });
		} catch {
			set({ error: "Failed to load friends", isLoading: false });
		}
	},

	resetFriends: () =>
		set({
			friends: [],
			isPanelOpen: false,
			searchQuery: "",
			isLoading: false,
			error: null,
		}),
}));

useAuthStore.subscribe((state, prevState) => {
	if (state.isAuthenticated && !prevState.isAuthenticated) {
		useFriendsStore.getState().fetchFriends();
	}
	if (!state.isAuthenticated && prevState.isAuthenticated) {
		useFriendsStore.getState().resetFriends();
	}
});
