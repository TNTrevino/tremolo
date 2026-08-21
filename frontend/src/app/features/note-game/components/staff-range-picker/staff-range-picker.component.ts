import {
	ChangeDetectionStrategy,
	Component,
	computed,
	ElementRef,
	input,
	output,
	viewChild,
} from "@angular/core";
import { NgIcon } from "@ng-icons/core";

import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import type { RangeClef } from "../../../../shared/models/music.models";
import { CLEF_UNICODE } from "../../models/engine.models";
import {
	BOTTOM_LINE_INDEX,
	indexToNote,
	ledgerSteps,
	noteToIndex,
	RANGE_BOUNDS,
	staffSteps,
} from "../../models/range.utils";

/**
 * Staff-based note range selector. Port of
 * frontend-react/src/features/note-game/components/StaffRangePicker.tsx.
 *
 * A mini staff with the two range endpoints drawn as whole notes. Each moves
 * one staff position at a time, by the chevron buttons or by dragging the
 * note head. Endpoints are natural notes, so one index step is one line or
 * space -- all of that arithmetic is in `models/range.utils.ts`.
 *
 * Every geometry constant below is React's, unchanged: the picker is
 * photographed by the note-game baselines.
 *
 * `RangeClef` is treble/bass only, and deliberately so
 * (`frontend/CLAUDE.md`).
 */

// SVG geometry: one staff-position step is half the line spacing.
const LINE_SPACING = 14;
const STEP = LINE_SPACING / 2;
const STAFF_TOP = 56; // y of the top staff line
const STAFF_LEFT = 44;
const STAFF_WIDTH = 168;
const HEIGHT = 168;
const WIDTH = STAFF_LEFT + STAFF_WIDTH + 8;
const LOW_X = STAFF_LEFT + 46;
const HIGH_X = STAFF_LEFT + 122;

/** Codepoints shared with the clef glyph; `dy` positions them at this scale. */
const CLEF_GLYPHS: Record<RangeClef, { glyph: string; dy: number }> = {
	treble: { glyph: CLEF_UNICODE.treble, dy: 3.1 * LINE_SPACING },
	bass: { glyph: CLEF_UNICODE.bass, dy: 1.05 * LINE_SPACING },
};

/** y coordinate of a staff-position step (0 = bottom line). */
function stepToY(steps: number): number {
	return STAFF_TOP + 4 * LINE_SPACING - steps * STEP;
}

type Endpoint = "low" | "high";

interface WholeNoteGeometry {
	x: number;
	y: number;
	ledgers: { y: number; x1: number; x2: number }[];
	hitX: number;
	hitY: number;
	lowRotate: string;
	highRotate: string;
}

@Component({
	selector: "app-staff-range-picker",
	imports: [ButtonComponent, NgIcon],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
	`,
	template: `
		<div class="flex items-center gap-2">
			<div class="flex flex-col gap-1">
				<app-button
					size="sm"
					variant="outline"
					className="h-7 w-7 p-0"
					ariaLabel="Lowest note up"
					(click)="move('low', lowIndex() + 1)"
				>
					<ng-icon name="lucideChevronUp" size="1rem" aria-hidden="true" />
				</app-button>
				<app-button
					size="sm"
					variant="outline"
					className="h-7 w-7 p-0"
					ariaLabel="Lowest note down"
					(click)="move('low', lowIndex() - 1)"
				>
					<ng-icon name="lucideChevronDown" size="1rem" aria-hidden="true" />
				</app-button>
			</div>

			<svg
				#staff
				[attr.viewBox]="viewBox"
				class="w-56 text-foreground select-none"
				role="img"
				[attr.aria-label]="'Note range from ' + low() + ' to ' + high()"
				(pointermove)="onPointerMove($event)"
				(pointerup)="onPointerUp()"
				(pointerleave)="onPointerUp()"
			>
				@for (line of staffLines; track line) {
					<line
						[attr.x1]="staffLeft - 30"
						[attr.x2]="staffLeft + staffWidth"
						[attr.y1]="staffTop + line * lineSpacing"
						[attr.y2]="staffTop + line * lineSpacing"
						stroke="currentColor"
						stroke-width="1.2"
					/>
				}
				<text
					[attr.x]="staffLeft - 28"
					[attr.y]="staffTop + clefGlyph().dy"
					[attr.font-size]="lineSpacing * 3.4"
					fill="currentColor"
				>
					{{ clefGlyph().glyph }}
				</text>

				@for (endpoint of endpoints; track endpoint) {
					@let note = geometry()[endpoint];
					<g
						class="cursor-grab touch-none"
						role="presentation"
						(pointerdown)="onPointerDown(endpoint, $event)"
					>
						@for (ledger of note.ledgers; track ledger.y) {
							<line
								[attr.x1]="ledger.x1"
								[attr.x2]="ledger.x2"
								[attr.y1]="ledger.y"
								[attr.y2]="ledger.y"
								stroke="currentColor"
								stroke-width="1.5"
							/>
						}
						<!-- invisible hit area so grabbing is easy -->
						<rect
							[attr.x]="note.hitX"
							[attr.y]="note.hitY"
							width="32"
							height="32"
							fill="transparent"
						/>
						<ellipse
							[attr.cx]="note.x"
							[attr.cy]="note.y"
							rx="8.5"
							ry="5.5"
							fill="currentColor"
							[attr.transform]="note.lowRotate"
						/>
						<ellipse
							[attr.cx]="note.x"
							[attr.cy]="note.y"
							rx="4.6"
							ry="3"
							class="fill-card"
							[attr.transform]="note.highRotate"
						/>
					</g>
				}
			</svg>

			<div class="flex flex-col gap-1">
				<app-button
					size="sm"
					variant="outline"
					className="h-7 w-7 p-0"
					ariaLabel="Highest note up"
					(click)="move('high', highIndex() + 1)"
				>
					<ng-icon name="lucideChevronUp" size="1rem" aria-hidden="true" />
				</app-button>
				<app-button
					size="sm"
					variant="outline"
					className="h-7 w-7 p-0"
					ariaLabel="Highest note down"
					(click)="move('high', highIndex() - 1)"
				>
					<ng-icon name="lucideChevronDown" size="1rem" aria-hidden="true" />
				</app-button>
			</div>
		</div>
	`,
})
export class StaffRangePickerComponent {
	readonly clef = input.required<RangeClef>();
	/** Low endpoint, natural note (e.g. "C4"). */
	readonly low = input.required<string>();
	/** High endpoint, natural note (e.g. "C6"). */
	readonly high = input.required<string>();

	readonly rangeChange = output<{ low: string; high: string }>();

	private readonly svg = viewChild<ElementRef<SVGSVGElement>>("staff");

	private dragging: Endpoint | null = null;

	protected readonly viewBox = `0 0 ${WIDTH} ${HEIGHT}`;
	protected readonly staffLines = [0, 1, 2, 3, 4];
	protected readonly staffLeft = STAFF_LEFT;
	protected readonly staffWidth = STAFF_WIDTH;
	protected readonly staffTop = STAFF_TOP;
	protected readonly lineSpacing = LINE_SPACING;
	protected readonly endpoints: Endpoint[] = ["low", "high"];

	protected readonly lowIndex = computed(() => noteToIndex(this.low()));
	protected readonly highIndex = computed(() => noteToIndex(this.high()));
	protected readonly clefGlyph = computed(() => CLEF_GLYPHS[this.clef()]);

	protected readonly geometry = computed<Record<Endpoint, WholeNoteGeometry>>(
		() => ({
			low: this.wholeNote(this.lowIndex(), LOW_X),
			high: this.wholeNote(this.highIndex(), HIGH_X),
		}),
	);

	/**
	 * Moves one endpoint, keeping it inside the clef's bounds and at least
	 * one step clear of the other. React's clamping, unchanged.
	 */
	protected move(which: Endpoint, targetIndex: number): void {
		const bounds = RANGE_BOUNDS[this.clef()];
		const lowIndex = this.lowIndex();
		const highIndex = this.highIndex();

		if (which === "low") {
			const next = Math.max(bounds.min, Math.min(targetIndex, highIndex - 1));
			if (next !== lowIndex) {
				this.rangeChange.emit({ low: indexToNote(next), high: this.high() });
			}
			return;
		}

		const next = Math.min(bounds.max, Math.max(targetIndex, lowIndex + 1));
		if (next !== highIndex) {
			this.rangeChange.emit({ low: this.low(), high: indexToNote(next) });
		}
	}

	protected onPointerDown(which: Endpoint, event: PointerEvent): void {
		this.dragging = which;
		(event.target as Element).setPointerCapture?.(event.pointerId);
	}

	protected onPointerMove(event: PointerEvent): void {
		if (!this.dragging) return;
		this.move(this.dragging, this.yToIndex(event.clientY));
	}

	protected onPointerUp(): void {
		this.dragging = null;
	}

	private yToIndex(clientY: number): number {
		const svg = this.svg()?.nativeElement;
		if (!svg) return 0;
		const rect = svg.getBoundingClientRect();
		const y = ((clientY - rect.top) / rect.height) * HEIGHT;
		const steps = Math.round((STAFF_TOP + 4 * LINE_SPACING - y) / STEP);
		return steps + BOTTOM_LINE_INDEX[this.clef()];
	}

	private wholeNote(index: number, x: number): WholeNoteGeometry {
		const clef = this.clef();
		const y = stepToY(staffSteps(index, clef));
		return {
			x,
			y,
			ledgers: ledgerSteps(index, clef).map((step) => ({
				y: stepToY(step),
				x1: x - 13,
				x2: x + 13,
			})),
			hitX: x - 16,
			hitY: y - 16,
			lowRotate: `rotate(-14 ${x} ${y})`,
			highRotate: `rotate(24 ${x} ${y})`,
		};
	}
}
