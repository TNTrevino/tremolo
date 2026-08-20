import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router, RouterLink } from "@angular/router";
import { NgIcon } from "@ng-icons/core";
import { filter, map } from "rxjs";

import { AuthService } from "../../../auth/services/auth.service";
import { AuthStore } from "../../../auth/services/auth.store";
import { FriendsUiStore } from "../../../features/friends/services/friends.store";
import { ButtonComponent } from "../../../shared/components/ui/button.component";
import { cn } from "../../../shared/utils/cn";
import { ThemeStore } from "../../services/theme.store";

interface NavLink {
	to: string;
	label: string;
}

interface GameLink extends NavLink {
	description: string;
}

/**
 * Port of frontend-react/src/shared/components/layout/Navigation.tsx.
 *
 * The chrome that wraps every route: brand, primary links, the Games
 * dropdown, role-dependent links, the theme toggle, the friends toggle and
 * the account menu.
 *
 * Two things here are acceptance criteria rather than styling:
 *
 * - **The accessible names.** `Switch to light theme` / `Switch to dark
 *   theme`, `Open friends` / `Close friends`, `Open menu` / `Close menu`,
 *   `Account menu`. Phase 0 added them to the React app precisely so the
 *   parity suite could reach these controls, and the toggle's name is how
 *   a spec reads the current theme.
 * - **Menus are `@if`-ed, never CSS-hidden.** A spec asserts a signed-in
 *   user's name is *visible* after login; if the closed account dropdown
 *   still rendered that name into the DOM, `getByText(...).first()` would
 *   pick the hidden copy. React mounted these conditionally and so do we.
 *
 * DESIGN.md rule 3: the selected state is an ink fill, never brass, and
 * `hover:bg-accent` is the quiet wash.
 */
@Component({
	selector: "app-navigation",
	imports: [ButtonComponent, NgIcon, RouterLink],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./navigation.component.html",
	host: { "(document:keydown)": "onDocumentKeydown($event)" },
})
export class NavigationComponent {
	private readonly router = inject(Router);
	private readonly auth = inject(AuthService);

	protected readonly store = inject(AuthStore);
	protected readonly theme = inject(ThemeStore);
	protected readonly friends = inject(FriendsUiStore);

	protected readonly mobileMenuOpen = signal(false);
	protected readonly userMenuOpen = signal(false);
	protected readonly gamesMenuOpen = signal(false);

	protected readonly primaryLinks: NavLink[] = [
		{ to: "/home", label: "Tremolo" },
		{ to: "/sheet-music", label: "Practice" },
	];

	protected readonly gameLinks: GameLink[] = [
		{
			to: "/note-game",
			label: "Note Game",
			description: "Name notes on the staff",
		},
		{
			to: "/key-signature-game",
			label: "Key Signatures",
			description: "Name the key from its signature",
		},
		{
			to: "/interval-game",
			label: "Intervals",
			description: "Name the distance between two notes",
		},
		{
			to: "/scale-game",
			label: "Scales",
			description: "Name the scale type you see",
		},
		{
			to: "/chord-game",
			label: "Chords",
			description: "Name the chord quality you see",
		},
	];

	protected readonly secondaryLinks: NavLink[] = [
		{ to: "/about", label: "About" },
		{ to: "/convert", label: "Convert" },
	];

	/**
	 * The current path, as a signal. React read `useLocation().pathname`;
	 * `toSignal` over the router's `NavigationEnd` stream is the same read,
	 * and it owns its own subscription (PLAN.md 5.6 -- nobody unsubscribes
	 * by hand).
	 */
	private readonly path = toSignal(
		this.router.events.pipe(
			filter((event) => event instanceof NavigationEnd),
			map(() => stripQuery(this.router.url)),
		),
		{ initialValue: stripQuery(this.router.url) },
	);

	protected readonly roleLinks = computed<NavLink[]>(() => {
		if (!this.store.isAuthenticated()) return [];
		const role = this.store.role();
		if (role === "TEACHER") return [{ to: "/classes", label: "Classes" }];
		if (role === "STUDENT")
			return [{ to: "/assignments", label: "Assignments" }];
		return [];
	});

	protected readonly isGameActive = computed(() =>
		this.gameLinks.some((link) => link.to === this.path()),
	);

	protected readonly initials = computed(() => {
		const user = this.store.user();
		if (!user) return "";
		return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
	});

	protected readonly themeLabel = computed(() =>
		this.theme.theme() === "dark"
			? "Switch to light theme"
			: "Switch to dark theme",
	);

	protected isActive(path: string): boolean {
		return this.path() === path;
	}

	/** DESIGN.md rule 3: selected = ink fill, otherwise a quiet hover wash. */
	protected navLinkClass(active: boolean, extra = ""): string {
		return cn(
			"px-4 py-2 rounded-md text-sm font-medium transition-all",
			active
				? "bg-primary text-primary-foreground"
				: "text-foreground hover:bg-accent hover:text-accent-foreground",
			extra,
		);
	}

	protected toggleGamesMenu(): void {
		this.gamesMenuOpen.update((open) => !open);
	}

	protected toggleUserMenu(): void {
		this.userMenuOpen.update((open) => !open);
	}

	protected toggleMobileMenu(): void {
		this.mobileMenuOpen.update((open) => !open);
	}

	protected closeMenus(): void {
		this.gamesMenuOpen.set(false);
		this.userMenuOpen.set(false);
	}

	protected toggleFriends(): void {
		this.friends.togglePanel();
	}

	/**
	 * React's `useLogout` cleared the session and let `ProtectedRoute`
	 * re-render, which bounced a signed-in-only page to /login while
	 * leaving a public one alone. Angular guards do not re-run on their
	 * own, so the session is cleared and the current URL is re-navigated:
	 * `onSameUrlNavigation: "reload"` (app.config.ts) makes the guards run
	 * again and reproduces both halves of that behaviour.
	 */
	protected logout(): void {
		this.auth.logout();
		this.userMenuOpen.set(false);
		this.mobileMenuOpen.set(false);
		void this.router.navigateByUrl(this.router.url);
	}

	protected onDocumentKeydown(event: KeyboardEvent): void {
		if (event.key !== "Escape") return;
		if (!this.gamesMenuOpen() && !this.userMenuOpen()) return;
		this.closeMenus();
	}
}

function stripQuery(url: string): string {
	return url.split(/[?#]/)[0] ?? url;
}
