import { ChangeDetectionStrategy, Component } from "@angular/core";

import { scaleGame } from "../../games/scale.game";
import { IdentificationGameComponent } from "../identification-game/identification-game.component";

/** `/scale-game`. Port of frontend-react/src/pages/ScaleGamePage.tsx. */
@Component({
	selector: "app-scale-game-page",
	imports: [IdentificationGameComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<app-identification-game [definition]="definition" />`,
})
export class ScaleGamePageComponent {
	protected readonly definition = scaleGame;
}
