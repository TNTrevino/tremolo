import { mainApiClient } from "./clients";
import type { FriendResponse } from "./types";
import type { Friend } from "@/features/friends/types";

const mapFriendResponse = (response: FriendResponse): Friend => ({
	id: response.id,
	firstName: response.first_name,
	lastName: response.last_name,
	role: response.role,
	instrument: response.instrument,
	avatarUrl: response.avatar_url,
	school: response.school,
});

export const getFriends = async (): Promise<Friend[]> => {
	const response = await mainApiClient.get<FriendResponse[]>("/api/friends");
	return response.data.map(mapFriendResponse);
};

export const searchUsers = async (query: string): Promise<Friend[]> => {
	const response = await mainApiClient.get<FriendResponse[]>(
		"/api/friends/search",
		{ params: { q: query } },
	);
	return response.data.map(mapFriendResponse);
};

export const addFriend = async (friendId: number): Promise<void> => {
	await mainApiClient.post("/api/friends", { friend_id: friendId });
};

export const friendsService = {
	getFriends,
	searchUsers,
	addFriend,
};

export default friendsService;
