import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, type Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import {
	type Friend,
	type FriendResponse,
	mapFriendResponse,
} from "../models/friends.models";

/**
 * Friends HTTP. Port of frontend-react/src/services/api/friends.service.ts,
 * on PLAN.md 5.1: Observables in, Observables out (D5), snake_case to
 * camelCase at this boundary and nowhere else.
 *
 * The three TanStack hooks in
 * frontend-react/src/shared/hooks/queries/useFriendsQuery.ts are gone, and
 * their machinery with them (D6). What they carried that is *not* machinery
 * lives on at the call sites instead:
 *
 * - `useFriends`'s `enabled: isAuthenticated` -- the panel is only rendered
 *   for a signed-in user, so the resource cannot fire for an anonymous one.
 * - `useSearchUsers`'s `enabled: trimmed.length > 0` -- the search
 *   resource's `params` returns `undefined` for a blank query, which leaves
 *   it `idle` and never calls this service.
 * - `useAddFriend`'s `invalidateQueries(friendsKeys.list())` -- the friends
 *   list is a resource on `MyFriendsViewComponent`, which the panel
 *   destroys while the add view is up. Coming back re-creates it and it
 *   fetches. No cache to invalidate is the point of D6, not a gap in it.
 * - The `staleTime`s (60s, 30s) are cache tuning and have no meaning
 *   without a cache.
 */
@Injectable({ providedIn: "root" })
export class FriendsService {
	private readonly http = inject(HttpClient);
	private readonly base = `${environment.coreApi}/api/friends`;

	/** The signed-in user's friends. */
	getFriends(): Observable<Friend[]> {
		return this.http
			.get<FriendResponse[]>(this.base)
			.pipe(map((rows) => rows.map(mapFriendResponse)));
	}

	/** Users matching a name fragment, for the add-friend view. */
	searchUsers(query: string): Observable<Friend[]> {
		return this.http
			.get<FriendResponse[]>(`${this.base}/search`, {
				params: new HttpParams().set("q", query),
			})
			.pipe(map((rows) => rows.map(mapFriendResponse)));
	}

	/** Adds `friendId` to the signed-in user's friends. */
	addFriend(friendId: number): Observable<void> {
		return this.http.post<void>(this.base, { friend_id: friendId });
	}
}
