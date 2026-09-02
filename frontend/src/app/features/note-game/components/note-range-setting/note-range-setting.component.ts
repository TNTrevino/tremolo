import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
} from "@angular/core";

import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import type { RangeClef } from "../../../../shared/models/music.models";
import type { GameSettings } from "../../models/note-game.models";
import { DEFAULT_RANGE } from "../../models/range.utils";
import { StaffRangePickerComponent } from "../staff-range-picker/staff-range-picker.component";

/**
 * Clef toggle plus staff range picker. Port of
 * frontend-react/src/features/note-game/components/NoteRangeSetting.tsx.
 *
 * Shared by every note-game settings surface: the desktop bar's dialog and
 * the mobile drawer. Switching clef resets the range to that clef's default,
 * so the endpoints always sit near the staff rather than eight ledger lines
 * off it.
 *
 * **Treble and bass only.** `RangeClef` is `Extract<StaffClef, "treble" |
 * "bass">` and that is the invariant, not an omission -- the identification
 * games' seven-clef picker is a different control.
 */
@Component({
	selector: "app-note-range-setting",
	imports: [ButtonComponent, StaffRangePickerComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
	`,
	template: `
		<div class="space-y-2">
			<div class="flex gap-2 justify-center">
				<app-button
					size="sm"
					[variant]="clef() === 'treble' ? 'default' : 'outline'"
					(click)="selectClef('treble')"
				>
					Treble
				</app-button>
				<app-button
					size="sm"
					[variant]="clef() === 'bass' ? 'default' : 'outline'"
					(click)="selectClef('bass')"
				>
					Bass
				</app-button>
			</div>
			<div class="flex justify-center">
				<app-staff-range-picker
					[clef]="clef()"
					[low]="lowNote()"
					[high]="highNote()"
					(rangeChange)="
						settingsChange.emit({ lowNote: $event.low, highNote: $event.high })
					"
				/>
			</div>
			<div class="text-xs text-muted-foreground text-center">
				{{ lowNote() }} – {{ highNote() }}
			</div>
		</div>
	`,
})
export class NoteRangeSettingComponent {
	readonly clef = input.required<RangeClef>();
	readonly lowNote = input.required<string>();
	readonly highNote = input.required<string>();

	readonly settingsChange = output<Partial<GameSettings>>();

	protected selectClef(clef: RangeClef): void {
		if (clef === this.clef()) return;
		this.settingsChange.emit({
			clef,
			lowNote: DEFAULT_RANGE[clef].low,
			highNote: DEFAULT_RANGE[clef].high,
		});
	}
}
