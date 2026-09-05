import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	ElementRef,
	input,
	signal,
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
	BEATS_PER_BAR,
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
const BOTTOM_LINE_Y = 164;
/** y of the top staff line. */
const TOP_LINE_Y = BOTTOM_LINE_Y - 4 * LINE_SPACING;
/**
 * Total height. Leaves 76px clear above the top line and below the bottom
 * line -- 3 ledger lines (48px) plus a note head and margin either way -- and
 * a further 24px at the top for the beat dots, which sit above the ledger
 * area rather than inside it.
 */
const STAFF_HEIGHT = 240;

/**
 * x of the fixed hit line, just right of the clef. A note is judged as it
 * crosses this, so the HUD's judgment popup anchors to the same number.
 */
export const HIT_LINE_X = 140;

const CLEF_X = 24;

/**
 * The visual metronome: one dot per beat of the bar, centred over the hit
 * line.
 *
 * Exactly one dot is filled at a time and it walks left to right, so the
 * student reads *where in the bar* they are rather than only that a beat
 * happened. Beat 1 fills brass, which is the beat
 * `StreamTransportService` already accents, so the loud click and the brass
 * dot are one event.
 *
 * The dots also run the count-in -- `COUNT_IN_BEATS` and `BEATS_PER_BAR` are
 * both 4, so a count-in is one bar -- and the numerals under them appear for
 * that bar only. During play they would be clutter; during the count-in they
 * are the countdown.
 */
const DOT_R = 6;
const DOT_GAP = 24;
const DOT_Y = 20;
/** Numeral baseline, far enough below the dot to clear its stroke. */
const DOT_NUMERAL_Y = DOT_Y + 22;
const DOT_NUMERAL_FONT_SIZE = 11;
/** Leftmost dot centre, so the row of four is centred on the hit line. */
const FIRST_DOT_X = HIT_LINE_X - ((BEATS_PER_BAR - 1) * DOT_GAP) / 2;

/** Dot fills, by role. Tailwind utilities so the tokens stay the one source. */
const DOT_CLASS = {
	unlit: "fill-none stroke-border",
	lit: "fill-foreground stroke-foreground",
	downbeat: "fill-brass stroke-brass",
} as const;

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

/**
 * How long a judged note stays visible, in beats.
 *
 * The fade is a span of the staff, so how long it lasts falls out of the
 * tempo rather than being set alongside it. `NoteStreamGameService` prunes
 * on this number, which is what keeps "stop drawing the note" tied to "the
 * note has finished fading" when the clef, the hit line or the fade span
 * moves.
 */
export const FADE_OUT_BEATS = (FADE_START_X - FADE_END_X) / PIXELS_PER_BEAT;

/** Ties the gradient and the mask together without colliding with anything. */
const FADE_MASK_ID = "stream-staff-fade";
const FADE_GRADIENT_ID = `${FADE_MASK_ID}-gradient`;

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

			<!--
				The visual metronome. Unlike the scroll, these go through a
				signal: the scroll moves every frame, but a dot changes once a
				beat, so at 120 BPM that is two renders a second rather than
				sixty. The rAF loop sets the signal and Angular does the rest.
			-->
			<g>
				@for (dot of beatDotXs; track dot.beat) {
					<circle
						[attr.data-beat]="dot.beat"
						[attr.cx]="dot.x"
						[attr.cy]="dotY"
						[attr.r]="dotR"
						[class]="dotClass(dot.beat)"
						stroke-width="2"
					/>
					@if (countingIn()) {
						<text
							[attr.x]="dot.x"
							[attr.y]="dotNumeralY"
							[attr.font-size]="dotNumeralFontSize"
							text-anchor="middle"
							class="fill-muted-foreground font-semibold"
						>
							{{ dot.beat + 1 }}
						</text>
					}
				}
			</g>

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
	/** Shows the numerals under the beat dots, for the count-in bar only. */
	readonly countingIn = input(false);

	private readonly scroller = viewChild<ElementRef<SVGGElement>>("scroller");

	/** Bar position of the beat now playing, 0-based. Set by the rAF loop. */
	private readonly litBeat = signal(0);

	protected readonly staffHeight = STAFF_HEIGHT;
	protected readonly staffLineYs = [0, 1, 2, 3, 4].map(
		(line) => TOP_LINE_Y + line * LINE_SPACING,
	);
	protected readonly fadeStartX = FADE_START_X;
	protected readonly fadeEndX = FADE_END_X;
	protected readonly fadeMaskId = FADE_MASK_ID;
	protected readonly fadeGradientId = FADE_GRADIENT_ID;
	protected readonly fadeMaskRef = `url(#${FADE_MASK_ID})`;
	protected readonly fadeGradientRef = `url(#${FADE_GRADIENT_ID})`;
	protected readonly hitLineX = HIT_LINE_X;
	protected readonly hitLineY1 = TOP_LINE_Y - LINE_SPACING;
	protected readonly hitLineY2 = BOTTOM_LINE_Y + LINE_SPACING;
	protected readonly headRx = HEAD_RX;
	protected readonly headRy = HEAD_RY;
	protected readonly dotY = DOT_Y;
	protected readonly dotR = DOT_R;
	protected readonly dotNumeralY = DOT_NUMERAL_Y;
	protected readonly dotNumeralFontSize = DOT_NUMERAL_FONT_SIZE;
	protected readonly beatDotXs = Array.from(
		{ length: BEATS_PER_BAR },
		(_, beat) => ({ beat, x: FIRST_DOT_X + beat * DOT_GAP }),
	);
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
			const paint = (): void => {
				const beat = beatOf();
				scrollTo(group, beat);
				// Setting the same value again notifies nothing, so the render
				// happens once per beat rather than once per frame.
				this.litBeat.set(barPosition(beat));
			};

			// Paint once even when stopped, so a ready/paused staff sits where
			// the clock says rather than at beat 0.
			untracked(paint);
			if (!running) return;

			let frame = 0;
			const step = (): void => {
				paint();
				frame = requestAnimationFrame(step);
			};
			frame = requestAnimationFrame(step);
			onCleanup(() => cancelAnimationFrame(frame));
		});
	}

	/** Exactly one dot is lit, and beat 1 of the bar is the brass one. */
	protected dotClass(beat: number): string {
		if (beat !== this.litBeat()) return DOT_CLASS.unlit;
		return beat === 0 ? DOT_CLASS.downbeat : DOT_CLASS.lit;
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

/**
 * Which beat of the bar a beat number falls on, 0-based.
 *
 * The count-in runs at *negative* beats, so the floor comes before the wrap:
 * a plain `%` would reflect the walk and count the bar backwards through the
 * count-in instead of left to right.
 */
function barPosition(beat: number): number {
	const index = Math.floor(beat);
	return ((index % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
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
