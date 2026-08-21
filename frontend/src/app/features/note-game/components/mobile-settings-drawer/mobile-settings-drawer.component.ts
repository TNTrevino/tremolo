import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	input,
	model,
	output,
} from "@angular/core";
import { NgIcon } from "@ng-icons/core";

import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { SelectComponent } from "../../../../shared/components/ui/select.component";
import {
	GameMode,
	NOTE_LIMITS,
	TIME_LIMITS,
} from "@features/identification-game";
import { type GameSettings, SCALES } from "../../models/note-game.models";
import { NoteRangeSettingComponent } from "../note-range-setting/note-range-setting.component";

/**
 * Full-screen bottom drawer for mobile game settings. Port of
 * frontend-react/src/features/note-game/components/MobileSettingsDrawer.tsx.
 *
 * Always in the DOM and slid off-screen when closed, exactly as React had it
 * -- that is what makes the transition animate, and it is also why
 * `e2e/support/app.ts` filters its scale picker on visibility rather than
 * assuming only one exists.
 */
@Component({
	selector: "app-mobile-settings-drawer",
	imports: [
		ButtonComponent,
		NgIcon,
		NoteRangeSettingComponent,
		SelectComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<!-- Backdrop -->
		<button
			type="button"
			aria-label="Close settings"
			[class]="backdropClasses()"
			(click)="open.set(false)"
		></button>

		<!-- Drawer -->
		<div [class]="drawerClasses()">
			<!-- Drag handle -->
			<div class="flex justify-center pt-3 pb-2">
				<div class="w-10 h-1 rounded-full bg-muted-foreground/30"></div>
			</div>

			<div class="px-5 pb-6 space-y-5 max-h-[80vh] overflow-y-auto">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2 text-lg font-semibold">
						<ng-icon
							name="lucideSettings"
							size="1.25rem"
							class="h-5 w-5 text-muted-foreground"
							aria-hidden="true"
						/>
						Game Settings
					</div>
					<app-button size="sm" variant="ghost" (click)="open.set(false)">
						Done
					</app-button>
				</div>

				<div class="space-y-2">
					<span class="text-sm font-medium text-muted-foreground">Mode</span>
					<div class="grid grid-cols-2 gap-2">
						<app-button
							[variant]="isTimeMode() ? 'default' : 'outline'"
							className="h-11"
							(click)="settingsChange.emit({ gameMode: modes.Time })"
						>
							time
						</app-button>
						<app-button
							[variant]="!isTimeMode() ? 'default' : 'outline'"
							className="h-11"
							(click)="settingsChange.emit({ gameMode: modes.Notes })"
						>
							notes
						</app-button>
					</div>
				</div>

				<div class="space-y-2">
					<span class="text-sm font-medium text-muted-foreground">
						{{ isTimeMode() ? "Time Limit" : "Note Limit" }}
					</span>
					<div class="grid grid-cols-4 gap-2">
						@for (limit of limits(); track limit) {
							<app-button
								[variant]="activeLimit() === limit ? 'default' : 'outline'"
								className="h-11"
								(click)="selectLimit(limit)"
							>
								{{ limit }}
							</app-button>
						}
					</div>
				</div>

				<div class="space-y-2">
					<label
						for="mobile-scale-select"
						class="text-sm font-medium text-muted-foreground"
					>
						Scale
					</label>
					<app-select
						selectId="mobile-scale-select"
						className="h-11"
						[value]="settings().scale"
						(valueChange)="settingsChange.emit({ scale: $event })"
					>
						@for (scale of scales; track scale) {
							<option [value]="scale">{{ scale }}</option>
						}
					</app-select>
				</div>

				<div class="space-y-2">
					<span class="text-sm font-medium text-muted-foreground">
						Note Range
					</span>
					<app-note-range-setting
						[clef]="settings().clef"
						[lowNote]="settings().lowNote"
						[highNote]="settings().highNote"
						(settingsChange)="settingsChange.emit($event)"
					/>
				</div>
			</div>
		</div>
	`,
})
export class MobileSettingsDrawerComponent {
	readonly settings = input.required<GameSettings>();
	readonly open = model(false);

	readonly settingsChange = output<Partial<GameSettings>>();

	protected readonly modes = GameMode;
	protected readonly scales = SCALES;

	protected readonly isTimeMode = computed(
		() => this.settings().gameMode === GameMode.Time,
	);
	protected readonly limits = computed<readonly number[]>(() =>
		this.isTimeMode() ? TIME_LIMITS : NOTE_LIMITS,
	);
	protected readonly activeLimit = computed(() =>
		this.isTimeMode() ? this.settings().timeLimit : this.settings().noteLimit,
	);

	protected readonly backdropClasses = computed(
		() =>
			`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
				this.open() ? "opacity-100" : "opacity-0 pointer-events-none"
			}`,
	);

	protected readonly drawerClasses = computed(
		() =>
			`fixed inset-x-0 bottom-0 z-50 bg-card border-t-2 border-border rounded-t-2xl transition-transform duration-300 ease-out ${
				this.open() ? "translate-y-0" : "translate-y-full"
			}`,
	);

	constructor() {
		// React locked body scroll in a useEffect with an unconditional
		// cleanup; the effect's onCleanup is the same contract, and it also
		// covers the drawer being destroyed while open.
		effect((onCleanup) => {
			const open = this.open();
			document.body.style.overflow = open ? "hidden" : "";
			onCleanup(() => {
				document.body.style.overflow = "";
			});
		});
	}

	protected selectLimit(limit: number): void {
		this.settingsChange.emit(
			this.isTimeMode() ? { timeLimit: limit } : { noteLimit: limit },
		);
	}
}
