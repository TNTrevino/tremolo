import { create } from "zustand";
import type { FriendsUIStore } from "@/features/friends/types";

export const useFriendsStore = create<FriendsUIStore>()((set) => ({
	isPanelOpen: false,
	searchQuery: "",

	togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
	setSearchQuery: (query: string) => set({ searchQuery: query }),
}));
