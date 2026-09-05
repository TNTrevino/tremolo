import { type ComponentFixture, TestBed } from "@angular/core/testing";

import type { RangeClef } from "../../../../shared/models/music.models";
import {
	CLEF_PATHS,
	CLEF_UNITS_PER_SPACE,
} from "../../../../shared/utils/clef-paths";
import { noteToIndex } from "../../../note-game/models/range.utils";
import {
	PIXELS_PER_BEAT,
	type StreamAccidental,
	type StreamJudgment,
	type StreamNote,
} from "../../models/note-stream.models";
import { HIT_LINE_X, StreamStaffComponent } from "./stream-staff.component";

/**
 * The staff is the only place pitch becomes geometry, so this spec pins the
 * arithmetic rather than the markup: a wrong y is a note the student reads as
 * the wrong pitch, and a wrong x is a note the score service judges at the
 * wrong moment.
 *
 * Every case runs with `running = false` and a stub clock, so no rAF loop
 * starts and the assertions see a still frame.
 */

/** y of the bottom staff line — the component's own anchor, restated here. */
const BOTTOM_LINE_Y = 140;
/** One staff position; two of them is one line-to-line step. */
const STEP = 8;
const LINE_SPACING = 2 * STEP;
const TOP_LINE_Y = BOTTOM_LINE_Y - 4 * LINE_SPACING;

function note(
	partial: Partial<StreamNote> & { name: string; diatonicIndex: number },
): StreamNote {
	return {
		id: 1,
		accidental: null,
		beat: 0,
		...partial,
	};
}

describe("StreamStaffComponent", () => {
	let fixture: ComponentFixture<StreamStaffComponent>;

	async function render(
		clef: RangeClef,
		notes: StreamNote[],
		options: {
			currentBeat?: number;
			judgments?: Record<number, StreamJudgment>;
		} = {},
	): Promise<void> {
		fixture = TestBed.createComponent(StreamStaffComponent);
		fixture.componentRef.setInput("clef", clef);
		fixture.componentRef.setInput("notes", notes);
		fixture.componentRef.setInput(
			"getCurrentBeat",
			() => options.currentBeat ?? 0,
		);
		fixture.componentRef.setInput(
			"judgmentFor",
			(id: number) => options.judgments?.[id],
		);
		fixture.detectChanges();
		await fixture.whenStable();
	}

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function group(id: number): SVGGElement {
		const found = el().querySelector<SVGGElement>(`g[data-note-id="${id}"]`);
		if (!found) throw new Error(`no rendered note with id ${id}`);
		return found;
	}

	/** Centre of a note head. */
	function head(id: number): { x: number; y: number } {
		const ellipse = group(id).querySelector("ellipse");
		if (!ellipse) throw new Error(`note ${id} has no head`);
		return {
			x: Number(ellipse.getAttribute("cx")),
			y: Number(ellipse.getAttribute("cy")),
		};
	}

	function ledgerYs(id: number): number[] {
		return (
			[...group(id).querySelectorAll("line")]
				// The stem is a line too, and it is the only vertical one.
				.filter((line) => line.getAttribute("x1") !== line.getAttribute("x2"))
				.map((line) => Number(line.getAttribute("y1")))
		);
	}

	afterEach(() => {
		TestBed.resetTestingModule();
	});

	it("draws five staff lines, a clef and the brass hit line", async () => {
		await render("treble", []);

		const staffLines = [...el().querySelectorAll("svg > line")];
		// Five staff lines plus the hit line.
		expect(staffLines).toHaveLength(6);

		const hitLine = el().querySelector<SVGLineElement>("line.text-brass");
		expect(hitLine).toBeTruthy();
		expect(hitLine?.getAttribute("x1")).toBe(String(HIT_LINE_X));
		expect(hitLine?.getAttribute("x1")).toBe(hitLine?.getAttribute("x2"));

		// The clef is a drawn path, not a character: see shared/utils/clef-paths.
		const clef = el().querySelector<SVGPathElement>("svg > path");
		expect(clef?.getAttribute("d")).toBe(CLEF_PATHS.treble.d);
		expect(el().querySelector("svg")?.getAttribute("aria-label")).toBe(
			"Scrolling staff, Treble Clef",
		);
	});

	it("anchors each clef to the line it names", async () => {
		// Treble's origin is the G line, three line-spacings below the top
		// line; bass's is the F line, one below. Both scale by the same
		// font-units-per-space, so only the translate differs.
		const scale = LINE_SPACING / CLEF_UNITS_PER_SPACE;

		await render("treble", []);
		expect(el().querySelector("svg > path")?.getAttribute("transform")).toBe(
			`translate(24 ${TOP_LINE_Y + 3 * LINE_SPACING}) scale(${scale})`,
		);

		await render("bass", []);
		expect(el().querySelector("svg > path")?.getAttribute("d")).toBe(
			CLEF_PATHS.bass.d,
		);
		expect(el().querySelector("svg > path")?.getAttribute("transform")).toBe(
			`translate(24 ${TOP_LINE_Y + LINE_SPACING}) scale(${scale})`,
		);
	});

	it("fades the notes out before they reach the clef", async () => {
		await render("treble", []);

		// The gradient runs black-to-white from the fade end to the hit line,
		// so a note is invisible left of x=76 and solid right of the hit line.
		// userSpaceOnUse pads outside that span, which is what makes one
		// gradient cover the whole staff.
		const gradient = el().querySelector("linearGradient");
		expect(gradient?.getAttribute("gradientUnits")).toBe("userSpaceOnUse");
		expect(gradient?.getAttribute("x1")).toBe("76");
		expect(gradient?.getAttribute("x2")).toBe(String(HIT_LINE_X));

		// The mask hangs on a wrapper, never on the scrolling group itself --
		// a transform there would move the mask with the notes.
		const masked = el().querySelector<SVGGElement>("g[mask]");
		expect(masked?.getAttribute("mask")).toBe("url(#stream-staff-fade)");
		expect(masked?.getAttribute("transform")).toBeNull();
		expect(masked?.querySelector("g")).toBeTruthy();
	});

	it("puts treble E4 on the bottom staff line", async () => {
		await render("treble", [
			note({ name: "E", diatonicIndex: noteToIndex("E4") }),
		]);

		expect(head(1).y).toBe(BOTTOM_LINE_Y);
		expect(ledgerYs(1)).toEqual([]);
	});

	it("gives treble C4 one ledger line below the staff", async () => {
		await render("treble", [
			note({ name: "C", diatonicIndex: noteToIndex("C4") }),
		]);

		// C4 is two staff positions below E4, so the head sits on the ledger.
		expect(head(1).y).toBe(BOTTOM_LINE_Y + 2 * STEP);
		expect(ledgerYs(1)).toEqual([BOTTOM_LINE_Y + 2 * STEP]);
	});

	it("puts bass G2 on the bottom staff line", async () => {
		await render("bass", [
			note({ name: "G", diatonicIndex: noteToIndex("G2") }),
		]);

		expect(head(1).y).toBe(BOTTOM_LINE_Y);
		expect(ledgerYs(1)).toEqual([]);
	});

	it("reads the same pitch letter differently per clef", async () => {
		const g2 = note({ name: "G", diatonicIndex: noteToIndex("G2") });
		await render("treble", [g2]);
		const inTreble = head(1).y;

		await render("bass", [g2]);

		// G2 is twelve staff positions below the treble staff's bottom line, and
		// sits on the bass staff's; a larger y is lower on the page.
		expect(inTreble).toBe(BOTTOM_LINE_Y + 12 * STEP);
		expect(head(1).y).toBe(BOTTOM_LINE_Y);
	});

	it("spaces notes at PIXELS_PER_BEAT from the hit line", async () => {
		await render("treble", [
			note({ id: 1, name: "E", diatonicIndex: noteToIndex("E4"), beat: 0 }),
			note({ id: 2, name: "G", diatonicIndex: noteToIndex("G4"), beat: 1 }),
			note({ id: 3, name: "B", diatonicIndex: noteToIndex("B4"), beat: 4.5 }),
		]);

		expect(head(1).x).toBe(HIT_LINE_X);
		expect(head(2).x).toBe(HIT_LINE_X + PIXELS_PER_BEAT);
		expect(head(3).x).toBe(HIT_LINE_X + 4.5 * PIXELS_PER_BEAT);
	});

	it("scrolls the whole stream with one group transform", async () => {
		await render(
			"treble",
			[note({ name: "E", diatonicIndex: noteToIndex("E4") })],
			{ currentBeat: 2 },
		);

		// Beat 2 has passed, so the group has moved two beats left; the note's
		// own x never changes.
		const scroller = group(1).parentElement as Element | null;
		expect(scroller?.getAttribute("transform")).toBe(
			`translate(${-2 * PIXELS_PER_BEAT} 0)`,
		);
		expect(head(1).x).toBe(HIT_LINE_X);
	});

	it("renders an accidental glyph only when the note carries one", async () => {
		const cases: [number, StreamAccidental, string | null][] = [
			[1, null, null],
			[2, "sharp", "♯"],
			[3, "flat", "♭"],
		];

		await render(
			"treble",
			cases.map(([id, accidental]) =>
				note({
					id,
					name: "F",
					diatonicIndex: noteToIndex("F4"),
					accidental,
					beat: id,
				}),
			),
		);

		for (const [id, , glyph] of cases) {
			const text = group(id).querySelector("text");
			expect(text?.textContent?.trim() ?? null).toBe(glyph);
		}
	});

	it("colours a judged note by its judgment and leaves the rest ink", async () => {
		await render(
			"treble",
			[
				note({ id: 1, name: "E", diatonicIndex: noteToIndex("E4"), beat: 0 }),
				note({ id: 2, name: "G", diatonicIndex: noteToIndex("G4"), beat: 1 }),
				note({ id: 3, name: "B", diatonicIndex: noteToIndex("B4"), beat: 2 }),
			],
			{ judgments: { 1: "perfect", 2: "miss" } },
		);

		expect(group(1).getAttribute("class")).toContain("text-correct");
		expect(group(2).getAttribute("class")).toContain("text-destructive");
		expect(group(3).getAttribute("class")).toBe("text-foreground");
	});
});
