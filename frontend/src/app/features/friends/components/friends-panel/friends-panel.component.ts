import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
} from "@angular/core";

import { cn } from "../../../../shared/utils/cn";
import { FriendsUiStore } from "../../services/friends.store";
import { AddFriendViewComponent } from "../add-friend-view/add-friend-view.component";
import { MyFriendsViewComponent } from "../my-friends-view/my-friends-view.component";

/**
 * The friends panel. Port of
 * frontend-react/src/features/friends/components/FriendsPanel.tsx.
 *
 * It hangs off the app shell rather than off a route -- `app.component.html`
 * renders it beside `<router-outlet>` whenever the user is signed in, which
 * is where `App.tsx` rendered it -- so it survives navigation. That
 * placement is what `e2e/specs/friends-and-theme.spec.ts` exists to catch.
 *
 * The `aside` stays mounted whether the panel is open or shut and slides in
 * on a transform, exactly as in React; only the mobile scrim is conditional.
 *
 * `isAddMode` is deliberately component state, not store state: React held
 * it in a `useState` here, and it resets when the panel is re-created. It is
 * also what makes the add view's `invalidateQueries` unnecessary -- swapping
 * back destroys and re-creates `MyFriendsViewComponent`, whose `rxResource`
 * then fetches a list that includes whoever was just added (D6).
 */
@Component({
	selector: "app-friends-panel",
	imports: [AddFriendViewComponent, MyFriendsViewComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	templateUrl: "./friends-panel.component.html",
})
export class FriendsPanelComponent {
	protected readonly ui = inject(FriendsUiStore);

	protected readonly isAddMode = signal(false);

	protected readonly asideClasses = computed(() =>
		cn(
			"fixed top-16 right-0 bottom-0 z-40 w-[85vw] md:w-80 flex flex-col",
			"bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
			"border-l-2 border-border shadow-lg",
			"transition-transform duration-300 ease-in-out",
			this.ui.isPanelOpen() ? "translate-x-0" : "translate-x-full",
		),
	);
}
