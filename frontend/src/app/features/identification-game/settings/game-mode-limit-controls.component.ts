import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from "@angular/core";

import { ButtonComponent } from "@shared/components/ui/button.component";
import { SelectComponent } from "@shared/components/ui/select.component";

import {
	GameMode,
	NOTE_LIMITS,
	TIME_LIMITS,
	type BaseGameSettings,
} from "../models/game-state.models";

/**
 * The two settings every game shares: mode, and the matching limit.
 *
 * Port of
 * frontend-react/src/features/identification-game/settings/GameModeLimitControls.tsx.
 * Rendered above the game's own `<app-settings-controls>` in the settings
 * dialog.
 *
 * Four accessible names here are acceptance criteria. `e2e/support/app.ts`
 * switches a game into question mode by clicking the button named exactly
 * **"Questions"** and then selecting on the control labelled
 * **"Questions"**; `e2e/specs/settings.spec.ts` asserts that an anonymous
 * reload puts the scale game back in timed mode by finding **"Time Limit"**
 * visible and "Questions" hidden. The label is `for=`-bound to the select,
 * so only the select answers to `getByLabel` -- the mode button next to it
 * has text, not a label, and does not collide.
 */
@Component({
	selector: "app-game-mode-limit-controls",
	imports: [ButtonComponent, SelectComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<div class="space-y-1">
			<label for="game-mode" class="text-xs font-medium">Mode</label>
			<div class="flex gap-1.5" id="game-mode" role="group">
				<app-button
					size="sm"
					[variant]="isTimeMode() ? 'default' : 'outline'"
					(click)="changed.emit({ gameMode: GameMode.Time })"
				>
					Time
				</app-button>
				<app-button
					size="sm"
					[variant]="isTimeMode() ? 'outline' : 'default'"
					(click)="changed.emit({ gameMode: GameMode.Notes })"
				>
					{{ unitLabel() }}
				</app-button>
			</div>
		</div>

		<div class="space-y-1">
			<label for="limit-selector" class="text-xs font-medium">
				{{ isTimeMode() ? "Time Limit" : unitLabel() }}
			</label>
			@if (isTimeMode()) {
				<app-select
					selectId="limit-selector"
					[value]="String(settings().timeLimit)"
					(valueChange)="changed.emit({ timeLimit: Number($event) })"
				>
					@for (limit of timeLimits; track limit) {
						<option [value]="limit">{{ formatTimeLimit(limit) }}</option>
					}
				</app-select>
			} @else {
				<app-select
					selectId="limit-selector"
					[value]="String(settings().noteLimit)"
					(valueChange)="changed.emit({ noteLimit: Number($event) })"
				>
					@for (limit of noteLimits; track limit) {
						<option [value]="limit">{{ limit }} {{ unit() }}</option>
					}
				</app-select>
			}
		</div>
	`,
})
export class GameModeLimitControlsComponent {
	readonly settings = input.required<BaseGameSettings>();

	/** Unit word for count mode ("questions", "notes"). */
	readonly unit = input("questions");

	readonly changed = output<Partial<BaseGameSettings>>();

	protected readonly GameMode = GameMode;
	protected readonly String = String;
	protected readonly Number = Number;
	protected readonly timeLimits = TIME_LIMITS;
	protected readonly noteLimits = NOTE_LIMITS;

	protected readonly isTimeMode = computed(
		() => this.settings().gameMode === GameMode.Time,
	);

	protected readonly unitLabel = computed(
		() => this.unit().charAt(0).toUpperCase() + this.unit().slice(1),
	);

	protected formatTimeLimit(limit: number): string {
		return limit >= 60
			? `${limit / 60} minute${limit > 60 ? "s" : ""}`
			: `${limit} seconds`;
	}
}
