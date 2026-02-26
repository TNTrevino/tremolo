import { create } from "zustand";
import type { Friend } from "@/features/friends/types";

const dicebearAvatar = (firstName: string, lastName: string) =>
	`https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}_${lastName}`;

const mockFriends: Friend[] = [
	{
		id: 1,
		firstName: "Maya",
		lastName: "Chen",
		role: "student",
		instrument: "violin",
		avatarUrl: dicebearAvatar("Maya", "Chen"),
		school: "Lincoln Middle School",
	},
	{
		id: 2,
		firstName: "Jordan",
		lastName: "Williams",
		role: "student",
		instrument: "trumpet",
		avatarUrl: dicebearAvatar("Jordan", "Williams"),
		school: "Lincoln Middle School",
	},
	{
		id: 3,
		firstName: "Sofia",
		lastName: "Martinez",
		role: "student",
		instrument: "flute",
		avatarUrl: dicebearAvatar("Sofia", "Martinez"),
		school: "Westlake High School",
	},
	{
		id: 4,
		firstName: "Ethan",
		lastName: "Nakamura",
		role: "student",
		instrument: "cello",
		avatarUrl: dicebearAvatar("Ethan", "Nakamura"),
		school: "Westlake High School",
	},
	{
		id: 5,
		firstName: "Aisha",
		lastName: "Patel",
		role: "student",
		instrument: "clarinet",
		avatarUrl: dicebearAvatar("Aisha", "Patel"),
		school: "Riverside Academy",
	},
	{
		id: 6,
		firstName: "Marcus",
		lastName: "Thompson",
		role: "teacher",
		instrument: "piano",
		avatarUrl: dicebearAvatar("Marcus", "Thompson"),
		school: "Riverside Academy",
	},
	{
		id: 7,
		firstName: "Lily",
		lastName: "Okafor",
		role: "student",
		instrument: "saxophone",
		avatarUrl: dicebearAvatar("Lily", "Okafor"),
		school: "Harmony Arts School",
	},
	{
		id: 8,
		firstName: "Daniel",
		lastName: "Rivera",
		role: "teacher",
		instrument: "trombone",
		avatarUrl: dicebearAvatar("Daniel", "Rivera"),
		school: "Lincoln Middle School",
	},
	{
		id: 9,
		firstName: "Emma",
		lastName: "Johansson",
		role: "student",
		instrument: "oboe",
		avatarUrl: dicebearAvatar("Emma", "Johansson"),
		school: "Harmony Arts School",
	},
	{
		id: 10,
		firstName: "Tyler",
		lastName: "Kim",
		role: "student",
		instrument: "percussion",
		avatarUrl: dicebearAvatar("Tyler", "Kim"),
		school: "Westlake High School",
	},
];

interface FriendsStore {
	friends: Friend[];
	isPanelOpen: boolean;
	searchQuery: string;
	togglePanel: () => void;
	setSearchQuery: (query: string) => void;
	filteredFriends: () => Friend[];
}

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
