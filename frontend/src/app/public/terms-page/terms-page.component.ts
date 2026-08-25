import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";

import { CARD_DIRECTIVES } from "../../shared/components/ui/card.directive";

/**
 * The terms of service, reachable signed out at /terms.
 *
 * Static copy, no state and no request -- same shape as `AboutPageComponent`
 * and `PrivacyPageComponent`. The content is a first-draft agreement written
 * against what the app actually does as of this commit (see the DRAFT
 * comment at the top of the template); it is not legal advice and has not
 * been reviewed by counsel.
 */
@Component({
	selector: "app-terms-page",
	imports: [RouterLink, ...CARD_DIRECTIVES],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./terms-page.component.html",
})
export class TermsPageComponent {
	protected readonly lastUpdated = "August 25, 2026";
	protected readonly contactEmail = "contact@tremolonotes.com";
}
