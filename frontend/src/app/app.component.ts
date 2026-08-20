import { Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";

import { NavigationComponent } from "./core/components/navigation/navigation.component";
import { ToastContainerComponent } from "./core/components/toast/toast-container.component";
import { ThemeStore } from "./core/services/theme.store";

/**
 * The app shell. Port of `AppContent` in frontend-react/src/App.tsx: the
 * navigation bar and the toast container sit outside the router outlet, so
 * they survive navigation.
 *
 * Still missing, and Phase 3's: the friends panel, which React rendered
 * here whenever the user was signed in.
 */
@Component({
	selector: "app-root",
	imports: [RouterOutlet, NavigationComponent, ToastContainerComponent],
	templateUrl: "./app.component.html",
	styleUrl: "./app.component.css",
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
}
