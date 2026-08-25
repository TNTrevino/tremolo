import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";

import { CARD_DIRECTIVES } from "../../shared/components/ui/card.directive";

/**
 * The privacy policy, reachable signed out at /privacy.
 *
 * Static copy, no state and no request -- same shape as `AboutPageComponent`.
 * The content is a first-draft policy written against what the app actually
 * stores as of this commit (see the DRAFT comment at the top of the
 * template); it is not legal advice and has not been reviewed by counsel.
 */
@Component({
	selector: "app-privacy-page",
	imports: [RouterLink, ...CARD_DIRECTIVES],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./privacy-page.component.html",
})
export class PrivacyPageComponent {
	protected readonly lastUpdated = "August 25, 2026";
	protected readonly contactEmail = "contact@tremolonotes.com";
}
