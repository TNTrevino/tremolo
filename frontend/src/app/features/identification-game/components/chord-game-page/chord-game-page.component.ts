import { ChangeDetectionStrategy, Component } from "@angular/core";

import { chordGame } from "../../games/chord.game";
import { IdentificationGameComponent } from "../identification-game/identification-game.component";

/** `/chord-game`. Port of frontend-react/src/pages/ChordGamePage.tsx. */
@Component({
	selector: "app-chord-game-page",
	imports: [IdentificationGameComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<app-identification-game [definition]="definition" />`,
})
export class ChordGamePageComponent {
	protected readonly definition = chordGame;
}
