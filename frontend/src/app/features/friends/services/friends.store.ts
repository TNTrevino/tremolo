import { Injectable, signal } from "@angular/core";

/**
 * Signal store (D7) replacing the Zustand
 * frontend-react/src/stores/friends.store.ts.
 *
 * Phase 2 needs it because the friends toggle lives in the navigation bar
 * -- the panel it opens is Phase 3's work, and nothing here reaches the
 * API. This is a verbatim port of the UI half of the React store:
 * `isPanelOpen`, `searchQuery`, and their two setters.
 */
@Injectable({ providedIn: "root" })
export class FriendsUiStore {
	private readonly _isPanelOpen = signal(false);
	private readonly _searchQuery = signal("");

	readonly isPanelOpen = this._isPanelOpen.asReadonly();
	readonly searchQuery = this._searchQuery.asReadonly();

	togglePanel(): void {
		this._isPanelOpen.update((open) => !open);
	}

	setSearchQuery(query: string): void {
		this._searchQuery.set(query);
	}
}
