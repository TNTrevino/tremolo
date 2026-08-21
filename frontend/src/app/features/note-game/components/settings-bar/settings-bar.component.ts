import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	input,
	output,
	signal,
} from "@angular/core";
import { NgIcon } from "@ng-icons/core";

import { AuthStore } from "../../../../auth/services/auth.store";
import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { DIALOG_DIRECTIVES } from "../../../../shared/components/ui/dialog.component";
import { SelectComponent } from "../../../../shared/components/ui/select.component";
import { BreakpointService } from "../../../../shared/services/breakpoint.service";
import {
	GameMode,
	NOTE_LIMITS,
	TIME_LIMITS,
} from "@features/identification-game/data";
import { type GameSettings, SCALES } from "../../models/note-game.models";
import { KeyboardBindingsDialogComponent } from "../keyboard-bindings-dialog/keyboard-bindings-dialog.component";
import { MobileSettingsDrawerComponent } from "../mobile-settings-drawer/mobile-settings-drawer.component";
import { NoteRangeSettingComponent } from "../note-range-setting/note-range-setting.component";

/**
 * The pre-game settings bar. Port of
 * frontend-react/src/features/note-game/components/SettingsBar.tsx.
 *
 * Three layouts, one mounted at a time: the full desktop bar, a one-line
 * summary that opens the drawer on phones, and a stacked summary for phone
 * landscape. React chose between three components; the flags on
 * `BreakpointService` are mutually exclusive, so three template branches are
 * the same thing.
 *
 * **The desktop bar's controls are acceptance criteria.** `useQuestionMode`
 * in `e2e/support/app.ts` drives the note game by clicking the button named
 * exactly `notes` and then the one named exactly `10`, and
 * `settings.spec.ts` reads the scale picker by its accessible name `Scale`.
 * The identification games keep the same controls behind a Settings dialog;
 * the note game keeps them inline, and that difference is what the helper
 * branches on.
 */
@Component({
	selector: "app-settings-bar",
	imports: [
		ButtonComponent,
		KeyboardBindingsDialogComponent,
		MobileSettingsDrawerComponent,
		NgIcon,
		NoteRangeSettingComponent,
		SelectComponent,
		...DIALOG_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
	`,
	template: `
		@if (breakpoints.isPhoneLandscape()) {
			<button
				type="button"
				class="flex flex-col items-center justify-center gap-1 bg-card border-2 border-border rounded-lg px-2 py-2 cursor-pointer w-full h-full"
				(click)="drawerOpen.set(true)"
			>
				@for (part of summaryParts(); track part) {
					<span class="text-xs text-muted-foreground text-center">{{
						part
					}}</span>
				}
				<ng-icon
					name="lucideSettings"
					size="0.875rem"
					class="h-3.5 w-3.5 text-muted-foreground mt-1"
					aria-hidden="true"
				/>
			</button>
			<app-mobile-settings-drawer
				[settings]="settings()"
				[(open)]="drawerOpen"
				(settingsChange)="settingsChange.emit($event)"
			/>
		} @else if (breakpoints.isMobile()) {
			<button
				type="button"
				class="flex items-center justify-between bg-card border-2 border-border rounded-lg px-3 py-1.5 cursor-pointer w-full text-left"
				(click)="drawerOpen.set(true)"
			>
				<span class="text-sm text-muted-foreground truncate">{{
					summaryText()
				}}</span>
				<span class="flex-shrink-0 ml-2 p-1">
					<ng-icon
						name="lucideSettings"
						size="1rem"
						class="h-4 w-4 text-muted-foreground"
						aria-hidden="true"
					/>
				</span>
			</button>
			<app-mobile-settings-drawer
				[settings]="settings()"
				[(open)]="drawerOpen"
				(settingsChange)="settingsChange.emit($event)"
			/>
		} @else {
			<div
				class="flex flex-wrap items-center gap-2 md:gap-3 bg-card border-2 border-border rounded-lg px-3 md:px-4 py-2"
			>
				<div class="flex items-center gap-1">
					<app-button
						size="sm"
						[variant]="isTimeMode() ? 'default' : 'ghost'"
						(click)="settingsChange.emit({ gameMode: modes.Time })"
					>
						time
					</app-button>
					<app-button
						size="sm"
						[variant]="!isTimeMode() ? 'default' : 'ghost'"
						(click)="settingsChange.emit({ gameMode: modes.Notes })"
					>
						notes
					</app-button>
				</div>

				<div class="w-px bg-border self-stretch"></div>

				<div class="flex items-center gap-1">
					@for (limit of limits(); track limit) {
						<app-button
							size="sm"
							[variant]="activeLimit() === limit ? 'default' : 'ghost'"
							(click)="selectLimit(limit)"
						>
							{{ limit }}
						</app-button>
					}
				</div>

				<div class="w-px bg-border self-stretch"></div>

				<div class="flex items-center gap-2 [&>app-select]:w-auto">
					<app-select
						ariaLabel="Scale"
						className="w-28 h-9"
						[value]="settings().scale"
						(valueChange)="settingsChange.emit({ scale: $event })"
					>
						@for (scale of scales; track scale) {
							<option [value]="scale">{{ scale }}</option>
						}
					</app-select>

					<app-button
						size="sm"
						variant="outline"
						className="h-9"
						(click)="rangeDialogOpen.set(true)"
					>
						{{ settings().lowNote }}–{{ settings().highNote }}
					</app-button>

					<app-dialog [(open)]="rangeDialogOpen">
						<div appDialogContent>
							<div appDialogHeader><h2 appDialogTitle>Note Range</h2></div>
							<div class="px-6 py-4">
								<app-note-range-setting
									[clef]="settings().clef"
									[lowNote]="settings().lowNote"
									[highNote]="settings().highNote"
									(settingsChange)="settingsChange.emit($event)"
								/>
							</div>
							<div appDialogFooter>
								<app-button
									variant="default"
									(click)="rangeDialogOpen.set(false)"
								>
									Done
								</app-button>
							</div>
						</div>
					</app-dialog>
				</div>
			</div>
		}

		<button
			type="button"
			class="fixed bottom-4 right-4 z-40 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
			aria-label="Configure keyboard bindings"
			(click)="bindingsOpen.set(true)"
		>
			<ng-icon
				name="lucideKeyboard"
				size="1.25rem"
				class="h-5 w-5"
				aria-hidden="true"
			/>
		</button>

		<app-keyboard-bindings-dialog
			[(open)]="bindingsOpen"
			[canEdit]="isAuthenticated()"
			[bindings]="bindings()"
			(saveBindings)="saveBindings.emit($event)"
		/>
	`,
})
export class SettingsBarComponent {
	protected readonly breakpoints = inject(BreakpointService);
	private readonly auth = inject(AuthStore);

	readonly settings = input.required<GameSettings>();
	/** The player's current note-to-key map, for the bindings dialog. */
	readonly bindings = input.required<Record<string, string>>();

	readonly settingsChange = output<Partial<GameSettings>>();
	readonly saveBindings = output<Record<string, string>>();
	/**
	 * True while the bindings dialog is open. The page uses it to mute the
	 * game's keyboard stream so rebinding a key does not also answer with it.
	 */
	readonly bindingsOpenChange = output<boolean>();

	protected readonly modes = GameMode;
	protected readonly scales = SCALES;
	protected readonly isAuthenticated = this.auth.isAuthenticated;

	protected readonly drawerOpen = signal(false);
	protected readonly rangeDialogOpen = signal(false);
	protected readonly bindingsOpen = signal(false);

	protected readonly isTimeMode = computed(
		() => this.settings().gameMode === GameMode.Time,
	);
	protected readonly limits = computed<readonly number[]>(() =>
		this.isTimeMode() ? TIME_LIMITS : NOTE_LIMITS,
	);
	protected readonly activeLimit = computed(() =>
		this.isTimeMode() ? this.settings().timeLimit : this.settings().noteLimit,
	);

	/** The compact summary the phone layouts show instead of the controls. */
	protected readonly summaryParts = computed(() => {
		const settings = this.settings();
		const timed = this.isTimeMode();
		const limit = timed ? settings.timeLimit : settings.noteLimit;
		return [
			timed ? "time" : "notes",
			timed ? `${limit}s` : `${limit}`,
			settings.scale,
			`${settings.lowNote}–${settings.highNote}`,
		];
	});

	protected readonly summaryText = computed(() =>
		this.summaryParts().join("  /  "),
	);

	protected selectLimit(limit: number): void {
		this.settingsChange.emit(
			this.isTimeMode() ? { timeLimit: limit } : { noteLimit: limit },
		);
	}

	constructor() {
		// React relayed every open/close through one `handleDialogOpenChange`,
		// including the dialog closing itself on Escape or a backdrop click.
		// Reading the signal covers all of those in one place.
		effect(() => this.bindingsOpenChange.emit(this.bindingsOpen()));
	}
}
