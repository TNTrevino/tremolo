import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	output,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { NgIcon } from "@ng-icons/core";

import { AppErrorComponent } from "../../../../core/components/app-error/app-error.component";
import { SpinnerComponent } from "../../../../core/components/spinner/spinner.component";
import { NotificationService } from "../../../../core/services/notification.service";
import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { InputDirective } from "../../../../shared/components/ui/input.directive";
import { TooltipDirective } from "../../../../shared/components/ui/tooltip.directive";
import { getErrorMessage } from "../../../../shared/utils/error.utils";
import type { Friend } from "../../models/friends.models";
import { FriendsService } from "../../services/friends.service";
import { FriendsUiStore } from "../../services/friends.store";
import { FriendCardComponent } from "../friend-card/friend-card.component";

/**
 * The friends panel's default view. Port of
 * frontend-react/src/features/friends/components/MyFriendsView.tsx.
 *
 * PLAN.md 5.2 in miniature: `useFriends()` becomes an `rxResource`, and the
 * `isLoading / isError / data` ladder becomes the `@if` block in the
 * template. There is no cache and no `staleTime` (D6) -- the panel destroys
 * this component while the add view is up, so coming back is what refetches,
 * which is the behaviour React bought with `invalidateQueries`.
 *
 * The filter is client-side in React and stays client-side here: the search
 * box narrows the list already fetched and never hits `/api/friends/search`
 * (that is the *add* view's endpoint).
 *
 * Accessible names are contracts of `e2e/specs/friends-and-theme.spec.ts`:
 * the "Friends" heading, "Add friend", "Close friends", and the empty-state
 * copy "Looks lonely in here. Add some friends!".
 */
@Component({
	selector: "app-my-friends-view",
	imports: [
		AppErrorComponent,
		ButtonComponent,
		FriendCardComponent,
		InputDirective,
		NgIcon,
		SpinnerComponent,
		TooltipDirective,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	templateUrl: "./my-friends-view.component.html",
})
export class MyFriendsViewComponent {
	private readonly service = inject(FriendsService);
	private readonly notifications = inject(NotificationService);

	/** The search box's text lives on the store, exactly as in React. */
	protected readonly ui = inject(FriendsUiStore);

	readonly addFriend = output<void>();
	readonly closed = output<void>();

	protected readonly friends = rxResource({
		stream: () => this.service.getFriends(),
		defaultValue: [] as Friend[],
	});

	/**
	 * `resource.value()` **rethrows** when the resource is in its error
	 * state -- `defaultValue` only covers idle and loading -- and the count
	 * badge sits in the header, outside the template's error branch. React's
	 * `data = []` default swallowed the failure the same way, so the badge
	 * reads 0 rather than taking down the panel.
	 */
	protected readonly allFriends = computed(() =>
		this.friends.error() ? [] : this.friends.value(),
	);

	protected readonly filteredFriends = computed(() => {
		const friends = this.allFriends();
		const query = this.ui.searchQuery().trim().toLowerCase();
		if (!query) return friends;

		return friends.filter(
			(f) =>
				f.firstName.toLowerCase().includes(query) ||
				f.lastName.toLowerCase().includes(query) ||
				f.instrument.toLowerCase().includes(query) ||
				f.school.toLowerCase().includes(query),
		);
	});

	constructor() {
		// React's QueryClient toasted every failed query whose meta named an
		// `errorTitle`, on top of whatever the component rendered inline
		// (App.tsx's `QueryCache.onError`). `useFriends` set
		// "Failed to load friends", so this fetch owes both. The effect fires
		// on each null -> error transition, which is once per failed attempt,
		// the same cadence the cache handler had.
		effect(() => {
			const error = this.friends.error();
			if (error) {
				this.notifications.showError(
					getErrorMessage(error),
					"Failed to load friends",
				);
			}
		});
	}

	protected onSearch(event: Event): void {
		this.ui.setSearchQuery((event.target as HTMLInputElement).value);
	}
}
