import type { AxiosInstance } from "axios";
import type { FriendResponse } from "./types";
import type { Friend } from "@/features/friends/types";

export class FriendsService {
	constructor(private client: AxiosInstance) {}

	private mapFriendResponse(response: FriendResponse): Friend {
		return {
			id: response.id,
			firstName: response.first_name,
			lastName: response.last_name,
			role: response.role,
			instrument: response.instrument,
			avatarUrl: response.avatar_url,
			school: response.school,
		};
	}

	async getFriends(): Promise<Friend[]> {
		const response = await this.client.get<FriendResponse[]>("/api/friends");
		return response.data.map((f) => this.mapFriendResponse(f));
	}

	async searchUsers(query: string): Promise<Friend[]> {
		const response = await this.client.get<FriendResponse[]>(
			"/api/friends/search",
			{ params: { q: query } },
		);
		return response.data.map((f) => this.mapFriendResponse(f));
	}

	async addFriend(friendId: number): Promise<void> {
		await this.client.post("/api/friends", { friend_id: friendId });
	}
}
