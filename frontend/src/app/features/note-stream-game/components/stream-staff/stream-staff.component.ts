import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	ElementRef,
	input,
	untracked,
	viewChild,
} from "@angular/core";

// Data-only entry point, never the barrel: the barrel reaches
// `opensheetmusicdisplay` through `GameStaffComponent`, and this renderer
// exists precisely so that engraver is not on this page.
// `frontend/CLAUDE.md`, "Barrel vs data entry point".
import { CLEF_LABELS } from "@features/identification-game/data";

import type { RangeClef } from "../../../../shared/models/music.models";
import { CLEF_PATHS, clefTransform } from "../../../../shared/utils/clef-paths";
import { ledgerSteps, staffSteps } from "../../../note-game/models/range.utils";
import {
	PIXELS_PER_BEAT,
	type StreamAccidental,
	type StreamJudgment,
	type StreamNote,
} from "../../models/note-stream.models";

/**
 * SVG geometry. One SVG user unit is one CSS pixel -- there is no `viewBox`
 * and no scaling -- because the hit windows are expressed in beats and the
 * scroll is `PIXELS_PER_BEAT` px per beat. A `viewBox` would let the browser
 * rescale that and the note under the hit line would stop being the note the
 * score service judged.
 */
const LINE_SPACING = 16;
/** One staff position (line -> adjacent space) is half the line spacing. */
const STEP = LINE_SPACING / 2;
/** y of the bottom staff line. */
const BOTTOM_LINE_Y = 140;
/** y of the top staff line. */
const TOP_LINE_Y = BOTTOM_LINE_Y - 4 * LINE_SPACING;
/**
 * Total height. Leaves 76px clear above the top line and below the bottom
 * line -- 3 ledger lines (48px) plus a note head and margin either way.
 */
const STAFF_HEIGHT = 216;

/**
 * x of the fixed hit line, just right of the clef. A note is judged as it
 * crosses this, so the HUD's judgment popup anchors to the same number.
 */
export const HIT_LINE_X = 140;

const CLEF_X = 24;

/**
 * A judged note is gone by this x, which leaves the clef's space clear.
 * Engraved music never puts a note head on the clef, and a note that has been
 * played has no business still being on the staff.
 *
 * **The fade is a distance, not a duration.** The clef sits at a fixed x, so
 * the note has to clear the same ground at 30 BPM and at 200. A time-based
 * fade would strand notes on the clef at slow tempos.
 */
const FADE_END_X = 76;
/** Notes are at full strength from the hit line rightward. */
const FADE_START_X = HIT_LINE_X;
/** Ties the gradient and the mask together without colliding with anything. */
const FADE_MASK_ID = "stream-staff-fade";

const HEAD_RX = 9.5;
const HEAD_RY = 6.5;
/** Quarter-note stem: three and a half staff spaces. */
const STEM_LENGTH = 3.5 * LINE_SPACING;
const LEDGER_HALF_WIDTH = 15;
/** Staff-step of the middle line; at or above it the stem hangs down. */
const MIDDLE_LINE_STEP = 4;

const ACCIDENTAL_FONT_SIZE = 1.9 * LINE_SPACING;
const ACCIDENTAL_X_OFFSET = -26;
const ACCIDENTAL_GLYPHS: Record<
	Exclude<StreamAccidental, null>,
	{ glyph: string; dy: number }
> = {
	sharp: { glyph: "♯", dy: 7.5 },
	flat: { glyph: "♭", dy: 5 },
};

/** y of a staff-position step (0 = the bottom line, positive = upward). */
function stepToY(steps: number): number {
	return BOTTOM_LINE_Y - steps * STEP;
}

/** One note, fully positioned. Everything the template needs, no arithmetic. */
interface RenderedNote {
	id: number;
	/** Centre of the note head, inside the scrolling group. */
	x: number;
	y: number;
	ledgerYs: number[];
	ledgerX1: number;
	ledgerX2: number;
	stemX: number;
	stemY1: number;
	stemY2: number;
	accidental: string | null;
	accidentalX: number;
	accidentalY: number;
	headRotate: string;
}

/**
 * The scrolling staff for the note stream game.
 *
 * Five lines, a clef and a fixed brass hit line are static. Every note lives
 * inside **one** `<g>` at a fixed x of `HIT_LINE_X + beat * PIXELS_PER_BEAT`,
 * and the scroll is that group's `transform` -- one attribute write per
 * frame for the whole stream, rather than one per note.
 *
 * The rAF loop deliberately sits outside change detection. The app is
 * zoneless, so a frame callback triggers nothing on its own; the loop reaches
 * the group through `ElementRef` and mutates the attribute directly. Running
 * the scroll through a signal would schedule a whole render pass at 60 Hz for
 * a value no template branch depends on.
 *
 * The component takes the clock as a **function input** (`getCurrentBeat`)
 * rather than injecting the transport, so it renders, and tests, with no
 * service at all.
 */
@Component({
	selector: "app-stream-staff",
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}

		/*
		 * Judged notes animate; the colour itself is a Tailwind utility on the
		 * same group (text-correct / text-destructive), which the shapes pick
		 * up through currentColor. Only motion lives here.
		 */
		.stream-note--hit,
		.stream-note--miss {
			transform-box: fill-box;
			transform-origin: center;
		}

		.stream-note--hit {
			animation: stream-note-hit 340ms ease-out forwards;
		}

		.stream-note--miss {
			animation: stream-note-miss 340ms ease-out forwards;
		}

		@keyframes stream-note-hit {
			0% {
				transform: scale(1);
				opacity: 1;
			}
			30% {
				transform: scale(1.3);
				opacity: 1;
			}
			100% {
				transform: scale(1.3);
				opacity: 0;
			}
		}

		@keyframes stream-note-miss {
			from {
				opacity: 1;
			}
			to {
				opacity: 0.2;
			}
		}

		@media (prefers-reduced-motion: reduce) {
			.stream-note--hit,
			.stream-note--miss {
				animation: none;
				transform: none;
				opacity: 0.3;
			}
		}
	`,
	template: `
		<svg
			class="block w-full select-none overflow-hidden text-foreground"
			[attr.height]="staffHeight"
			role="img"
			[attr.aria-label]="ariaLabel()"
		>
			@for (y of staffLineYs; track y) {
				<line
					x1="0"
					x2="100%"
					[attr.y1]="y"
					[attr.y2]="y"
					stroke="currentColor"
					stroke-width="1.4"
				/>
			}

			<!--
				The fade the spent notes scroll into. One gradient over the whole
				staff does every note at once, so the scroll stays a single
				transform write per frame rather than an opacity write per note.
				The mask hangs on a wrapper with no transform of its own, which
				keeps its coordinates in the staff's user space.
			-->
			<defs>
				<linearGradient
					[attr.id]="fadeGradientId"
					gradientUnits="userSpaceOnUse"
					[attr.x1]="fadeEndX"
					y1="0"
					[attr.x2]="fadeStartX"
					y2="0"
				>
					<stop offset="0" stop-color="#000" />
					<stop offset="1" stop-color="#fff" />
				</linearGradient>
				<mask
					[attr.id]="fadeMaskId"
					maskUnits="userSpaceOnUse"
					x="0"
					y="0"
					width="100%"
					[attr.height]="staffHeight"
				>
					<rect
						x="0"
						y="0"
						width="100%"
						[attr.height]="staffHeight"
						[attr.fill]="fadeGradientRef"
					/>
				</mask>
			</defs>

			<path
				[attr.d]="clefPath()"
				[attr.transform]="clefTransform()"
				fill="currentColor"
			/>

			<!-- The interaction point, and the one brass thing on the staff. -->
			<line
				class="text-brass"
				[attr.x1]="hitLineX"
				[attr.x2]="hitLineX"
				[attr.y1]="hitLineY1"
				[attr.y2]="hitLineY2"
				stroke="currentColor"
				stroke-width="3"
				stroke-linecap="round"
			/>

			<g [attr.mask]="fadeMaskRef">
				<g #scroller>
					@for (note of renderedNotes(); track note.id) {
						@let judgment = judgmentFor()(note.id);
						<g [attr.data-note-id]="note.id" [class]="noteClass(judgment)">
							@for (ledgerY of note.ledgerYs; track ledgerY) {
								<line
									[attr.x1]="note.ledgerX1"
									[attr.x2]="note.ledgerX2"
									[attr.y1]="ledgerY"
									[attr.y2]="ledgerY"
									stroke="currentColor"
									stroke-width="1.6"
								/>
							}
							@if (note.accidental) {
								<text
									[attr.x]="note.accidentalX"
									[attr.y]="note.accidentalY"
									[attr.font-size]="accidentalFontSize"
									text-anchor="middle"
									fill="currentColor"
								>
									{{ note.accidental }}
								</text>
							}
							<line
								[attr.x1]="note.stemX"
								[attr.x2]="note.stemX"
								[attr.y1]="note.stemY1"
								[attr.y2]="note.stemY2"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
							<ellipse
								[attr.cx]="note.x"
								[attr.cy]="note.y"
								[attr.rx]="headRx"
								[attr.ry]="headRy"
								[attr.transform]="note.headRotate"
								fill="currentColor"
							/>
						</g>
					}
				</g>
			</g>
		</svg>
	`,
})
export class StreamStaffComponent {
	readonly clef = input.required<RangeClef>();
	/** Notes currently in flight, spawned ahead of the viewport. */
	readonly notes = input.required<readonly StreamNote[]>();
	/**
	 * Judgment lookup by note id. A plain function so the staff stays
	 * service-free; when it reads a signal the template tracks it and the
	 * judged styling lands on the next render.
	 */
	readonly judgmentFor = input<(id: number) => StreamJudgment | undefined>(
		() => undefined,
	);
	/** The transport clock, sampled once per frame. */
	readonly getCurrentBeat = input<() => number>(() => 0);
	/** Whether the rAF loop runs. Paused and finished states leave it off. */
	readonly running = input(false);

	private readonly scroller = viewChild<ElementRef<SVGGElement>>("scroller");

	protected readonly staffHeight = STAFF_HEIGHT;
	protected readonly staffLineYs = [0, 1, 2, 3, 4].map(
		(line) => TOP_LINE_Y + line * LINE_SPACING,
	);
	protected readonly clefX = CLEF_X;
	protected readonly fadeStartX = FADE_START_X;
	protected readonly fadeEndX = FADE_END_X;
	protected readonly fadeMaskId = FADE_MASK_ID;
	protected readonly fadeGradientId = `${FADE_MASK_ID}-gradient`;
	protected readonly fadeMaskRef = `url(#${FADE_MASK_ID})`;
	protected readonly fadeGradientRef = `url(#${FADE_MASK_ID}-gradient)`;
	protected readonly hitLineX = HIT_LINE_X;
	protected readonly hitLineY1 = TOP_LINE_Y - LINE_SPACING;
	protected readonly hitLineY2 = BOTTOM_LINE_Y + LINE_SPACING;
	protected readonly headRx = HEAD_RX;
	protected readonly headRy = HEAD_RY;
	protected readonly accidentalFontSize = ACCIDENTAL_FONT_SIZE;

	protected readonly clefPath = computed(() => CLEF_PATHS[this.clef()].d);
	protected readonly clefTransform = computed(() =>
		clefTransform(this.clef(), CLEF_X, TOP_LINE_Y, LINE_SPACING),
	);

	protected readonly ariaLabel = computed(
		() => `Scrolling staff, ${CLEF_LABELS[this.clef()]}`,
	);

	protected readonly renderedNotes = computed<RenderedNote[]>(() => {
		const clef = this.clef();
		return this.notes().map((note) => layout(note, clef));
	});

	constructor() {
		effect((onCleanup) => {
			const group = this.scroller()?.nativeElement;
			if (!group) return;

			const beatOf = this.getCurrentBeat();
			const running = this.running();

			// Paint once even when stopped, so a ready/paused staff sits where
			// the clock says rather than at beat 0.
			untracked(() => scrollTo(group, beatOf()));
			if (!running) return;

			let frame = 0;
			const step = (): void => {
				scrollTo(group, beatOf());
				frame = requestAnimationFrame(step);
			};
			frame = requestAnimationFrame(step);
			onCleanup(() => cancelAnimationFrame(frame));
		});
	}

	/**
	 * Colour comes from a utility so the tokens stay the single source; the
	 * `--hit`/`--miss` classes carry nothing but the animation.
	 */
	protected noteClass(judgment: StreamJudgment | undefined): string {
		if (!judgment) return "text-foreground";
		if (judgment === "miss") return "text-destructive stream-note--miss";
		return "text-correct stream-note--hit";
	}
}

/** The one write per frame: the whole stream moves as a single group. */
function scrollTo(group: SVGGElement, beat: number): void {
	group.setAttribute("transform", `translate(${-beat * PIXELS_PER_BEAT} 0)`);
}

function layout(note: StreamNote, clef: RangeClef): RenderedNote {
	const x = HIT_LINE_X + note.beat * PIXELS_PER_BEAT;
	const steps = staffSteps(note.diatonicIndex, clef);
	const y = stepToY(steps);
	// Below the middle line the stem goes up on the right; on or above it, it
	// hangs down on the left. Standard engraving, and it keeps high notes from
	// running out of the top of the svg.
	const stemUp = steps < MIDDLE_LINE_STEP;
	const accidental = note.accidental
		? ACCIDENTAL_GLYPHS[note.accidental]
		: null;

	return {
		id: note.id,
		x,
		y,
		ledgerYs: ledgerSteps(note.diatonicIndex, clef).map(stepToY),
		ledgerX1: x - LEDGER_HALF_WIDTH,
		ledgerX2: x + LEDGER_HALF_WIDTH,
		stemX: stemUp ? x + HEAD_RX - 1 : x - HEAD_RX + 1,
		stemY1: y,
		stemY2: stemUp ? y - STEM_LENGTH : y + STEM_LENGTH,
		accidental: accidental?.glyph ?? null,
		accidentalX: x + ACCIDENTAL_X_OFFSET,
		accidentalY: y + (accidental?.dy ?? 0),
		headRotate: `rotate(-20 ${x} ${y})`,
	};
}
