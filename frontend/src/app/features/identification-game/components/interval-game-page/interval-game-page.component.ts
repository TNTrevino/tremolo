import { ChangeDetectionStrategy, Component } from "@angular/core";

import { intervalGame } from "../../games/interval.game";
import { IdentificationGameComponent } from "../identification-game/identification-game.component";

/** `/interval-game`. Port of frontend-react/src/pages/IntervalGamePage.tsx. */
@Component({
	selector: "app-interval-game-page",
	imports: [IdentificationGameComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<app-identification-game [definition]="definition" />`,
})
export class IntervalGamePageComponent {
	protected readonly definition = intervalGame;
}
