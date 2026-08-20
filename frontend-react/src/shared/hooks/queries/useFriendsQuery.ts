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
		meta: { errorTitle: "Failed to load friends" },
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

	// suppressErrorToast: search fires on every keystroke — transient failures
	// are handled inline in AddFriendView rather than surfaced as a toast.
	return useQuery<Friend[]>({
		queryKey: friendsKeys.search(trimmed),
		queryFn: () => friendsService.searchUsers(trimmed),
		enabled: trimmed.length > 0,
		staleTime: 30 * 1000,
		// suppress global toast — search errors are shown inline in AddFriendView
		meta: { suppressErrorToast: true },
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
		meta: { errorTitle: "Failed to add friend" },
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: friendsKeys.list() });
		},
	});
}
