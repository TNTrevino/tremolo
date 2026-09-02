import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgIcon } from "@ng-icons/core";

import { ButtonComponent } from "../../shared/components/ui/button.component";

/**
 * The 404 page (#263): the router's `**` wildcard, so it renders for any
 * URL that matches nothing else in app.routes.ts -- including /dev/kit in
 * a production build, once `devOnlyGuard`'s `canMatch` sends the router
 * past that route (see dev/dev-only.guard.ts).
 *
 * Static copy, no state and no request, same shape as the other public
 * pages. The h1 here follows the about/privacy/terms convention rather
 * than the home hero's: `font-display` stays reserved for the marketing
 * hero and the auth card titles (see AboutPageComponent's doc comment) --
 * a 404 is a status page, not a moment.
 */
@Component({
	selector: "app-not-found-page",
	imports: [RouterLink, NgIcon, ButtonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./not-found-page.component.html",
})
export class NotFoundPageComponent {}
