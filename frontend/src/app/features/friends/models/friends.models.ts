/**
 * Friends types.
 *
 * `FriendResponse` is ported verbatim from
 * frontend-react/src/services/api/types/friend.types.ts and `Friend` from
 * frontend-react/src/features/friends/types.ts. The Go service speaks
 * snake_case (`DTOs/friend_dto.go`); everything inside the app speaks
 * camelCase, and `mapFriendResponse` is the only crossing point.
 *
 * The React `FriendsUIStore` interface has no port here: its two setters
 * are methods on `FriendsUiStore` (D7) and its two fields are that
 * service's signals, so a separate shape describing them would only be a
 * second place to keep in sync.
 */

import type { UserRole } from "../../../auth/models/auth.models";

export interface FriendResponse {
	id: number;
	first_name: string;
	last_name: string;
	role: UserRole;
	instrument: string;
	avatar_url: string;
	school: string;
}

export interface Friend {
	id: number;
	firstName: string;
	lastName: string;
	role: UserRole;
	instrument: string;
	avatarUrl: string;
	school: string;
}

/** Port of `FriendsService.mapFriendResponse` in the React service. */
export function mapFriendResponse(response: FriendResponse): Friend {
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
