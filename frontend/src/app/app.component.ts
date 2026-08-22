import { Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";

import { AuthStore } from "./auth/services/auth.store";
import { NavigationComponent } from "./core/components/navigation/navigation.component";
import { ToastContainerComponent } from "./core/components/toast/toast-container.component";
import { ThemeStore } from "./core/services/theme.store";
import { FriendsPanelComponent } from "./features/friends/components/friends-panel/friends-panel.component";

/**
 * The app shell. Port of `AppContent` in frontend-react/src/App.tsx: the
 * navigation bar, the friends panel and the toast container sit outside the
 * router outlet, so they survive navigation.
 *
 * `{isAuthenticated && <FriendsPanel />}` is the `@if` below. Gating it here
 * rather than inside the panel is what React did, and it is also what makes
 * the friends fetch impossible for an anonymous visitor -- there is no
 * component to hold the resource.
 */
@Component({
	selector: "app-root",
	imports: [
		RouterOutlet,
		NavigationComponent,
		ToastContainerComponent,
		FriendsPanelComponent,
	],
	templateUrl: "./app.component.html",
})
export class AppComponent {
	/**
	 * Injected for its constructor: `ThemeStore` reads localStorage and puts
	 * the `dark`/`light` class on `documentElement` the moment it exists.
	 * Nothing in this template reads it -- the nav bar's toggle does -- but
	 * the theme has to be applied at bootstrap, not when the first component
	 * that cares happens to render.
	 */
	protected readonly theme = inject(ThemeStore);

	/** Decides whether the friends panel is in the tree at all. */
	protected readonly auth = inject(AuthStore);
}
