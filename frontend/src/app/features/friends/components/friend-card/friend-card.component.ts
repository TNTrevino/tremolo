import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import type { Friend } from "../../models/friends.models";

/**
 * One row of the friends panel. Port of
 * frontend-react/src/features/friends/components/FriendCard.tsx.
 *
 * React's `action?: React.ReactNode` prop becomes content projection: the
 * add view puts its button between the tags, the friends list projects
 * nothing and the slot collapses. Same move D9 makes for `GameDefinition` --
 * markup crosses a boundary as a template, never as data.
 *
 * The host is `display: contents` (the same rule `<app-button>` follows) so
 * the row div is the scroll container's own child, exactly as in React.
 */
@Component({
	selector: "app-friend-card",
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	templateUrl: "./friend-card.component.html",
})
export class FriendCardComponent {
	readonly user = input.required<Friend>();
}
