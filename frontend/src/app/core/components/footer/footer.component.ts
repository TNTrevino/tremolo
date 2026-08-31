import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";

import { CONTACT_EMAIL } from "../../../shared/constants/contact";

/**
 * The site footer (#242): Privacy, Terms, About, Pricing and a mailto
 * Contact link, rendered once in app.component.html, outside the router
 * outlet -- the same way `<app-navigation>` and `<app-toast-container>`
 * are, so it survives navigation instead of being a per-page concern.
 *
 * Deliberately not a `<nav>` -- see the template comment: a second
 * navigation landmark would make e2e's `page.getByRole("navigation")`
 * ambiguous.
 */
@Component({
	selector: "app-footer",
	imports: [RouterLink],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./footer.component.html",
})
export class FooterComponent {
	protected readonly year = new Date().getFullYear();
	protected readonly contactEmail = CONTACT_EMAIL;
	protected readonly links = [
		{ to: "/privacy", label: "Privacy" },
		{ to: "/terms", label: "Terms" },
		{ to: "/about", label: "About" },
		{ to: "/pricing", label: "Pricing" },
	] as const;
}
