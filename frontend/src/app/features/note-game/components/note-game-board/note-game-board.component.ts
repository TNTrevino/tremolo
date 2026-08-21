import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	output,
} from "@angular/core";

import { BreakpointService } from "../../../../shared/services/breakpoint.service";
import { DEFAULT_NOTE_TO_KEY_MAP } from "../../models/keymap";
import type { NoteRange } from "../../models/note-game.models";
import { NoteButtonGridComponent } from "../note-button-grid/note-button-grid.component";
import { NoteStaffComponent } from "../note-staff/note-staff.component";

/**
 * The playing surface. Port of
 * frontend-react/src/features/note-game/components/GameBoard.tsx.
 *
 * React had two exports, `GameBoard` and `GameBoardLandscape`, sharing a
 * `useGameBoardCore` hook; the split survives as two components because the
 * landscape layout puts the status bar *beside* the staff, and the shared
 * core is now `<app-note-staff>` -- a more honest home for it than a hook
 * was. They are not merged into one component with two branches because a
 * template may project a given `<ng-content>` slot only once, whichever
 * `@if` arm it sits in.
 *
 * React's `ComponentErrorBoundary` + `GameBoardFallback` wrapper has no port:
 * Phase 2 replaced boundaries with error signals, and the failure this board
 * actually has -- MusicXML that will not render -- is handled inside
 * `<app-note-staff>` by the text fallback React's boundary never saw.
 */
@Component({
	selector: "app-note-game-board",
	imports: [NoteButtonGridComponent, NoteStaffComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<div class="flex flex-col flex-1 min-h-0 gap-2 sm:gap-4">
			<app-note-staff
				[className]="staffClassName()"
				[answersLength]="answersLength()"
				[scale]="scale()"
				[octave]="octave()"
				[range]="range()"
				[fallbackLabel]="currentNote()"
				(questionLoaded)="questionLoaded.emit($event)"
			/>
			<app-note-button-grid
				buttonHeight="h-11 sm:h-16 text-xs sm:text-lg"
				[keyMap]="keyMap()"
				(answer)="answer.emit($event)"
			/>
		</div>
	`,
})
export class NoteGameBoardComponent {
	protected readonly breakpoints = inject(BreakpointService);

	readonly answersLength = input.required<number>();
	readonly currentNote = input.required<string>();
	readonly scale = input.required<string>();
	readonly octave = input.required<number>();
	readonly range = input.required<NoteRange>();
	readonly keyMap = input<Record<string, string>>(DEFAULT_NOTE_TO_KEY_MAP);

	readonly answer = output<string>();
	readonly questionLoaded = output<string>();

	/** On phone portrait the staff is capped so the buttons keep their room. */
	protected readonly staffClassName = computed(() =>
		this.breakpoints.isMobile()
			? "flex-1 min-h-0 max-h-[45vh]"
			: "flex-1 min-h-0",
	);
}

/**
 * The phone-landscape layout: status bar and staff side by side on top, the
 * button grid spanning the full width below for bigger tap targets. Port of
 * `GameBoardLandscape`.
 */
@Component({
	selector: "app-note-game-board-landscape",
	imports: [NoteButtonGridComponent, NoteStaffComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<div class="flex flex-col flex-1 min-h-0 gap-1.5">
			<div class="flex gap-1.5 min-h-0 flex-1">
				<div class="w-28 flex-shrink-0"><ng-content /></div>
				<app-note-staff
					className="flex-1 min-h-0"
					[answersLength]="answersLength()"
					[scale]="scale()"
					[octave]="octave()"
					[range]="range()"
					[fallbackLabel]="currentNote()"
					(questionLoaded)="questionLoaded.emit($event)"
				/>
			</div>
			<app-note-button-grid
				buttonHeight="h-8 text-xs"
				[keyMap]="keyMap()"
				(answer)="answer.emit($event)"
			/>
		</div>
	`,
})
export class NoteGameBoardLandscapeComponent {
	readonly answersLength = input.required<number>();
	readonly currentNote = input.required<string>();
	readonly scale = input.required<string>();
	readonly octave = input.required<number>();
	readonly range = input.required<NoteRange>();
	readonly keyMap = input<Record<string, string>>(DEFAULT_NOTE_TO_KEY_MAP);

	readonly answer = output<string>();
	readonly questionLoaded = output<string>();
}
