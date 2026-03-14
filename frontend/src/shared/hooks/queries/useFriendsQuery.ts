import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { friendsService } from "@/services/api";
import type { Friend } from "@/features/friends/types";

export const friendsKeys = {
	all: ["friends"] as const,
	list: () => [...friendsKeys.all, "list"] as const,
	search: (query: string) => [...friendsKeys.all, "search", query] as const,
};

/**
 * Fetch the current user's friends list.
 * Only runs when the user is authenticated.
 */
export function useFriends() {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

	return useQuery<Friend[]>({
		queryKey: friendsKeys.list(),
		queryFn: () => friendsService.getFriends(),
		enabled: isAuthenticated,
		staleTime: 60 * 1000,
	});
}

/**
 * Search for users by name.
 * Only fetches when the query string is non-empty.
 */
export function useSearchUsers(query: string) {
	const trimmed = query.trim();

	return useQuery<Friend[]>({
		queryKey: friendsKeys.search(trimmed),
		queryFn: () => friendsService.searchUsers(trimmed),
		enabled: trimmed.length > 0,
		staleTime: 30 * 1000,
	});
}

/**
 * Mutation to add a friend.
 * Invalidates the friends list on success so it refetches.
 */
export function useAddFriend() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (friendId: number) => friendsService.addFriend(friendId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: friendsKeys.list() });
		},
	});
}
