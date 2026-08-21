import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from "@angular/core";

/**
 * Port of frontend-react/src/shared/components/music/RhythmGlyph.tsx.
 *
 * Renders a rhythm digit pattern (the /music/random encoding) as real
 * notation: beamed noteheads, partial sixteenth beams, flags on isolated
 * notes, and rest glyphs. Draws with `currentColor` so it works on any
 * button state.
 *
 * Encoding (one beat): rhythmType 16 -- "0" sixteenth rest, "1" sixteenth
 * note, "2" eighth note; rhythmType 8 -- "0" eighth rest, "1" eighth note.
 *
 * The geometry, the beam-grouping rules and the constants are unchanged.
 * What changes is only how the shapes reach the DOM: React pushed JSX into
 * an array, Angular computes plain data and the template `@for`s over it
 * -- the same move D9 makes for `GameDefinition`.
 */
export type RhythmType = 8 | 16;

interface RhythmEvent {
	/** Duration in sixteenth units. */
	units: number;
	isRest: boolean;
	/** Beams this note needs: 1 = eighth, 2 = sixteenth. */
	beams: number;
}

interface Head {
	cx: number;
	cy: number;
	transform: string;
}
interface Stem {
	x: number;
	y1: number;
	y2: number;
}
interface Flag {
	d: string;
}
interface Beam {
	x: number;
	y: number;
	width: number;
	height: number;
}
interface Rest {
	x: number;
	y: number;
	glyph: string;
}

function parse(rhythm: string, rhythmType: RhythmType): RhythmEvent[] {
	return [...rhythm].map((digit) => {
		if (rhythmType === 16) {
			if (digit === "2") return { units: 2, isRest: false, beams: 1 };
			return { units: 1, isRest: digit === "0", beams: 2 };
		}
		return { units: 2, isRest: digit === "0", beams: 1 };
	});
}

/** Human-readable name, used for aria labels on the buttons. */
export function describeRhythm(rhythm: string, rhythmType: RhythmType): string {
	return parse(rhythm, rhythmType)
		.map((event) => {
			const name = event.units === 1 ? "sixteenth" : "eighth";
			return event.isRest ? `${name} rest` : `${name} note`;
		})
		.join(", ");
}

// Geometry (viewBox units). One sixteenth of horizontal time = UNIT_W.
const UNIT_W = 13;
const PAD_LEFT = 7;
const PAD_RIGHT = 12;
const HEIGHT = 44;
const HEAD_Y = 34; // notehead center
const BEAM_Y = 8; // primary beam top
const BEAM_GAP = 5.5; // distance to the sixteenth beam
const BEAM_H = 3.2;
const STEM_DX = 4.1; // stem offset from notehead center
const STUB_W = 8;

const REST_GLYPHS: Record<number, string> = {
	1: "\u{1D13F}", // sixteenth rest
	2: "\u{1D13E}", // eighth rest
};

interface Drawing {
	width: number;
	heads: Head[];
	stems: Stem[];
	flags: Flag[];
	beams: Beam[];
	rests: Rest[];
}

function draw(rhythm: string, rhythmType: RhythmType): Drawing {
	const events = parse(rhythm, rhythmType);
	const totalUnits = events.reduce((sum, e) => sum + e.units, 0);
	const width = PAD_LEFT + totalUnits * UNIT_W + PAD_RIGHT;

	// x position (notehead center) per event, proportional to duration
	let cursor = PAD_LEFT;
	const xs = events.map((event) => {
		const x = cursor + 3;
		cursor += event.units * UNIT_W;
		return x;
	});

	// Beam groups: runs of consecutive notes (rests break beams)
	const groups: number[][] = [];
	let run: number[] = [];
	events.forEach((event, i) => {
		if (event.isRest) {
			if (run.length) groups.push(run);
			run = [];
		} else {
			run.push(i);
		}
	});
	if (run.length) groups.push(run);

	const heads: Head[] = [];
	const stems: Stem[] = [];
	const flags: Flag[] = [];
	const beams: Beam[] = [];
	const rests: Rest[] = [];

	for (const group of groups) {
		const beamed = group.length >= 2;

		for (const i of group) {
			const x = xs[i]!;
			heads.push({
				cx: x,
				cy: HEAD_Y,
				transform: `rotate(-20 ${x} ${HEAD_Y})`,
			});

			const stemTop = beamed ? BEAM_Y : HEAD_Y - 22;
			stems.push({ x: x + STEM_DX, y1: HEAD_Y - 1, y2: stemTop });

			// Flags for isolated notes
			if (!beamed) {
				for (let f = 0; f < events[i]!.beams; f++) {
					const y = stemTop + f * 6;
					flags.push({ d: `M ${x + STEM_DX} ${y} c 7 3, 8 8, 3.5 14` });
				}
			}
		}

		if (!beamed) continue;

		// Primary (eighth) beam across the whole group
		const first = group[0]!;
		const last = group[group.length - 1]!;
		const beamX1 = xs[first]! + STEM_DX - 0.7;
		const beamX2 = xs[last]! + STEM_DX + 0.7;
		beams.push({
			x: beamX1,
			y: BEAM_Y,
			width: beamX2 - beamX1,
			height: BEAM_H,
		});

		// Sixteenth beam: full segments between adjacent sixteenths, partial
		// stubs for a sixteenth next to an eighth
		const covered = new Set<number>();
		for (let g = 0; g < group.length - 1; g++) {
			const a = group[g]!;
			const b = group[g + 1]!;
			if (events[a]!.beams === 2 && events[b]!.beams === 2) {
				beams.push({
					x: xs[a]! + STEM_DX - 0.7,
					y: BEAM_Y + BEAM_GAP,
					width: xs[b]! - xs[a]! + 1.4,
					height: BEAM_H,
				});
				covered.add(a);
				covered.add(b);
			}
		}
		for (const i of group) {
			if (events[i]!.beams !== 2 || covered.has(i)) continue;
			// Stub points inward: left when the note has a group neighbour
			// before it, right when it opens the group
			const towardLeft = i !== group[0];
			const stemX = xs[i]! + STEM_DX;
			beams.push({
				x: towardLeft ? stemX - STUB_W : stemX - 0.7,
				y: BEAM_Y + BEAM_GAP,
				width: STUB_W,
				height: BEAM_H,
			});
		}
	}

	events.forEach((event, i) => {
		if (!event.isRest) return;
		rests.push({
			x: xs[i]!,
			y: HEAD_Y - 8,
			glyph: REST_GLYPHS[event.units]!,
		});
	});

	return { width, heads, stems, flags, beams, rests };
}

@Component({
	selector: "app-rhythm-glyph",
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<svg
			[attr.viewBox]="viewBox()"
			[class]="className()"
			role="img"
			[attr.aria-label]="label()"
		>
			@for (head of drawing().heads; track $index) {
				<ellipse
					[attr.cx]="head.cx"
					[attr.cy]="head.cy"
					rx="4.4"
					ry="3.1"
					[attr.transform]="head.transform"
					fill="currentColor"
				/>
			}
			@for (stem of drawing().stems; track $index) {
				<line
					[attr.x1]="stem.x"
					[attr.x2]="stem.x"
					[attr.y1]="stem.y1"
					[attr.y2]="stem.y2"
					stroke="currentColor"
					stroke-width="1.4"
				/>
			}
			@for (flag of drawing().flags; track $index) {
				<path
					[attr.d]="flag.d"
					stroke="currentColor"
					stroke-width="2.4"
					fill="none"
					stroke-linecap="round"
				/>
			}
			@for (beam of drawing().beams; track $index) {
				<rect
					[attr.x]="beam.x"
					[attr.y]="beam.y"
					[attr.width]="beam.width"
					[attr.height]="beam.height"
					fill="currentColor"
				/>
			}
			@for (rest of drawing().rests; track $index) {
				<text
					[attr.x]="rest.x"
					[attr.y]="rest.y"
					font-size="26"
					fill="currentColor"
					text-anchor="middle"
					dominant-baseline="central"
				>
					{{ rest.glyph }}
				</text>
			}
		</svg>
	`,
})
export class RhythmGlyphComponent {
	/** Digit pattern, e.g. "1111", "0111", "10". */
	readonly rhythm = input.required<string>();
	readonly rhythmType = input.required<RhythmType>();
	readonly className = input("h-9 w-auto");

	protected readonly drawing = computed(() =>
		draw(this.rhythm(), this.rhythmType()),
	);
	protected readonly viewBox = computed(
		() => `0 0 ${this.drawing().width} ${HEIGHT}`,
	);
	protected readonly label = computed(() =>
		describeRhythm(this.rhythm(), this.rhythmType()),
	);
}
