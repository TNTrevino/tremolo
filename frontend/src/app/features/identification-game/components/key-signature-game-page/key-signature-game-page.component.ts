import { ChangeDetectionStrategy, Component } from "@angular/core";

import { keySignatureGame } from "../../games/key-signature.game";
import { IdentificationGameComponent } from "../identification-game/identification-game.component";

/**
 * `/key-signature-game`.
 *
 * Port of frontend-react/src/pages/KeySignatureGamePage.tsx, which is the
 * whole page in React too: a game is its definition, and the shell is the
 * page. If this file ever grows a branch, something game-specific has
 * leaked out of the definition.
 */
@Component({
	selector: "app-key-signature-game-page",
	imports: [IdentificationGameComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<app-identification-game [definition]="definition" />`,
})
export class KeySignatureGamePageComponent {
	protected readonly definition = keySignatureGame;
}
