import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	type ElementRef,
	inject,
	output,
	signal,
	viewChild,
} from "@angular/core";
import { rxResource, toObservable, toSignal } from "@angular/core/rxjs-interop";
import { NgIcon } from "@ng-icons/core";
import { debounceTime } from "rxjs";

import { SpinnerComponent } from "../../../../core/components/spinner/spinner.component";
import { NotificationService } from "../../../../core/services/notification.service";
import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { InputDirective } from "../../../../shared/components/ui/input.directive";
import { getErrorMessage } from "../../../../shared/utils/error.utils";
import type { Friend } from "../../models/friends.models";
import { FriendsService } from "../../services/friends.service";
import { FriendCardComponent } from "../friend-card/friend-card.component";

/** Unchanged from React's `AddFriendView`. */
const DEBOUNCE_MS = 120;

/**
 * The friends panel's add view. Port of
 * frontend-react/src/features/friends/components/AddFriendView.tsx.
 *
 * Two React mechanisms become one operator and one resource:
 *
 * - `useDebounce(query, 120)` is `debounceTime(120)` on the query signal's
 *   observable. The hook's `clearTimeout` cleanup is what `debounceTime`
 *   does by definition, and `toSignal` owns the subscription (PLAN.md 5.6),
 *   so there is nothing to tear down by hand.
 * - `useSearchUsers(debouncedQuery)`'s `enabled: trimmed.length > 0` is the
 *   resource's `params` returning `undefined`: a resource with undefined
 *   params stays `idle` and never calls its stream. That is also why the
 *   "Search for someone by name" prompt is the initial state -- `value()`
 *   is the default `[]` and nothing has been requested.
 *
 * Search errors are shown inline and **not** toasted, matching
 * `useSearchUsers`'s `meta.suppressErrorToast`: it fires on every keystroke
 * and a transient failure is not worth a toast. Adding a friend does toast,
 * matching `useAddFriend`'s `errorTitle`.
 *
 * Accessible names `e2e/specs/friends-and-theme.spec.ts` selects on: the
 * "Add Friend" heading, "Back to friends", the "Search by name..."
 * placeholder, and `Add <full name>` flipping to `<full name> added`.
 */
@Component({
	selector: "app-add-friend-view",
	imports: [
		ButtonComponent,
		FriendCardComponent,
		InputDirective,
		NgIcon,
		SpinnerComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	templateUrl: "./add-friend-view.component.html",
})
export class AddFriendViewComponent {
	private readonly service = inject(FriendsService);
	private readonly notifications = inject(NotificationService);

	readonly back = output<void>();

	private readonly searchInput =
		viewChild.required<ElementRef<HTMLInputElement>>("searchInput");

	protected readonly query = signal("");

	private readonly debouncedQuery = toSignal(
		toObservable(this.query).pipe(debounceTime(DEBOUNCE_MS)),
		{ initialValue: "" },
	);

	protected readonly results = rxResource({
		params: () => this.debouncedQuery().trim() || undefined,
		stream: ({ params }) => this.service.searchUsers(params),
		defaultValue: [] as Friend[],
	});

	/** Ids added during this visit -- the button flips in place, as in React. */
	protected readonly addedIds = signal<ReadonlySet<number>>(new Set<number>());
	protected readonly addingId = signal<number | null>(null);

	constructor() {
		// React focused the box in a mount effect; this is the same moment,
		// after the view exists.
		afterNextRender(() => this.searchInput().nativeElement.focus());
	}

	/** True once the debounce has settled on a non-empty query. */
	protected hasQuery(): boolean {
		return this.debouncedQuery().trim().length > 0;
	}

	protected fullName(user: Friend): string {
		return `${user.firstName} ${user.lastName}`;
	}

	protected onSearch(event: Event): void {
		this.query.set((event.target as HTMLInputElement).value);
	}

	protected add(user: Friend): void {
		if (this.addedIds().has(user.id) || this.addingId() === user.id) return;

		this.addingId.set(user.id);

		// A one-shot POST: a plain subscribe in the handler is the shape
		// PLAN.md 5.6 prescribes -- it completes after one emission.
		this.service.addFriend(user.id).subscribe({
			next: () => {
				this.addingId.set(null);
				this.addedIds.update((ids) => new Set(ids).add(user.id));
			},
			error: (error: unknown) => {
				this.addingId.set(null);
				this.notifications.showError(
					getErrorMessage(error),
					"Failed to add friend",
				);
			},
		});
	}
}
