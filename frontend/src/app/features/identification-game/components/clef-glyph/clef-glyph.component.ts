import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from "@angular/core";

import type { StaffClef } from "@shared/models/music.models";

import { CLEF_LABELS, CLEF_UNICODE } from "../../game.utils";

/**
 * A clef drawn on a mini five-line staff, for settings chips and pickers.
 *
 * Port of
 * frontend-react/src/features/identification-game/components/ClefGlyph.tsx.
 * The SVG geometry is unchanged; only the layout tables move from module
 * scope in a `.tsx` to module scope in a `.ts`.
 *
 * `CLEF_LABELS` and `CLEF_UNICODE` used to live here. Phase 7 moved them to
 * `game.utils.ts` so that a caller wanting a clef *string* -- the note
 * game's staff-range picker does -- can take it from `data.ts` without
 * loading an Angular component. Same values, same single declaration.
 */

// Which staff line (0 = bottom) each clef centers on, plus a per-glyph
// font size (the three glyphs have very different metrics).
const GLYPHS: Record<StaffClef, { line: number; fontSize: number }> = {
	treble: { line: 2, fontSize: 30 },
	bass: { line: 3, fontSize: 22 },
	alto: { line: 2, fontSize: 24 },
	tenor: { line: 3, fontSize: 24 },
	soprano: { line: 0, fontSize: 24 },
	mezzo_soprano: { line: 1, fontSize: 24 },
	baritone: { line: 2, fontSize: 22 },
};

const LINE_SPACING = 6;
// Enough headroom above and below the staff that every clef glyph
// (the treble clef especially) stays inside the viewBox.
const STAFF_TOP = 16;
const WIDTH = 46;
const HEIGHT = 56;

const LINE_INDEXES = [0, 1, 2, 3, 4] as const;

const lineY = (index: number): number => STAFF_TOP + (4 - index) * LINE_SPACING;

@Component({
	selector: "app-clef-glyph",
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<svg
			[attr.viewBox]="viewBox"
			[class]="className()"
			role="img"
			[attr.aria-label]="label()"
		>
			@for (index of lineIndexes; track index) {
				<line
					[attr.x1]="4"
					[attr.x2]="innerWidth"
					[attr.y1]="lineY(index)"
					[attr.y2]="lineY(index)"
					stroke="currentColor"
					[attr.stroke-width]="1"
				/>
			}
			<text
				[attr.x]="centerX"
				[attr.y]="lineY(glyph().line)"
				[attr.font-size]="glyph().fontSize"
				fill="currentColor"
				text-anchor="middle"
				dominant-baseline="central"
			>
				{{ character() }}
			</text>
		</svg>
	`,
})
export class ClefGlyphComponent {
	readonly clef = input.required<StaffClef>();

	/**
	 * Sized with CSS so containers can scale it without clipping -- the SVG
	 * keeps its aspect ratio from the viewBox. React's default, unchanged.
	 */
	readonly className = input("h-10 w-auto");

	protected readonly viewBox = `0 0 ${WIDTH} ${HEIGHT}`;
	protected readonly innerWidth = WIDTH - 4;
	protected readonly centerX = WIDTH / 2;
	protected readonly lineIndexes = LINE_INDEXES;
	protected readonly lineY = lineY;

	protected readonly glyph = computed(() => GLYPHS[this.clef()]);
	protected readonly character = computed(() => CLEF_UNICODE[this.clef()]);
	protected readonly label = computed(() => CLEF_LABELS[this.clef()]);
}
