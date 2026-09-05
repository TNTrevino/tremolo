import { type ComponentFixture, TestBed } from "@angular/core/testing";

import type { RangeClef } from "../../../../shared/models/music.models";
import {
	CLEF_PATHS,
	CLEF_UNITS_PER_SPACE,
} from "../../../../shared/utils/clef-paths";
import { StaffRangePickerComponent } from "./staff-range-picker.component";

/**
 * The picker turns two note names into staff geometry, so this spec pins the
 * geometry rather than the markup.
 *
 * The clef cases exist because the picker and `StreamStaffComponent` took the
 * same text-to-path change, and only the other one had a spec. A clef that
 * anchors to the wrong line is a picker that lies about which notes the range
 * covers.
 */

// The component's own constants, restated so a change to either side shows up
// here rather than passing silently.
const LINE_SPACING = 14;
const STAFF_TOP = 56;
const STAFF_LEFT = 44;
/** The clef sits two pixels inside the left end of the staff lines. */
const CLEF_X = STAFF_LEFT - 28;

describe("StaffRangePickerComponent", () => {
	let fixture: ComponentFixture<StaffRangePickerComponent>;

	function render(clef: RangeClef, low: string, high: string): void {
		fixture = TestBed.createComponent(StaffRangePickerComponent);
		fixture.componentRef.setInput("clef", clef);
		fixture.componentRef.setInput("low", low);
		fixture.componentRef.setInput("high", high);
		fixture.detectChanges();
	}

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function clefEl(): SVGPathElement {
		const path = el().querySelector<SVGPathElement>("svg > path");
		if (!path) throw new Error("no clef path rendered");
		return path;
	}

	afterEach(() => {
		TestBed.resetTestingModule();
	});

	// Each clef anchors its origin to the line it names: treble to the G
	// line, three line-spacings below the top; bass to the F line, one below,
	// which is the line its two dots straddle.
	const ANCHORS = [
		["treble", "C4", "C6", 3],
		["bass", "E2", "E4", 1],
	] as const;

	for (const [clef, low, high, lineFromTop] of ANCHORS) {
		it(`anchors the ${clef} clef to the line it names`, () => {
			render(clef, low, high);

			const scale = LINE_SPACING / CLEF_UNITS_PER_SPACE;
			expect(clefEl().getAttribute("d")).toBe(CLEF_PATHS[clef].d);
			expect(clefEl().getAttribute("transform")).toBe(
				`translate(${CLEF_X} ${STAFF_TOP + lineFromTop * LINE_SPACING}) scale(${scale})`,
			);
		});
	}

	it("draws the clef on the staff, not beside it", () => {
		render("treble", "C4", "C6");

		// The lines start 30px left of staffLeft; the glyph's own translate has
		// to land to the right of that, or the clef floats off the staff. This
		// is the whole difference the before/after screenshots show, so it is
		// read off the rendered transform rather than off the constants.
		const firstLine = el().querySelector<SVGLineElement>("svg > line");
		const lineStart = Number(firstLine?.getAttribute("x1"));
		const translateX = Number(
			/translate\((-?[\d.]+)/.exec(
				clefEl().getAttribute("transform") ?? "",
			)?.[1],
		);

		expect(lineStart).toBe(STAFF_LEFT - 30);
		expect(translateX).toBeGreaterThan(lineStart);
	});

	it("swaps the glyph when the clef changes", () => {
		render("treble", "C4", "C6");

		fixture.componentRef.setInput("clef", "bass");
		fixture.detectChanges();

		expect(clefEl().getAttribute("d")).toBe(CLEF_PATHS.bass.d);
	});

	it("gives C4 one ledger line and C6 two, in treble", () => {
		render("treble", "C4", "C6");

		// Two endpoints; each ledger line is a horizontal line inside its group.
		const groups = [...el().querySelectorAll("svg > g")];
		expect(groups).toHaveLength(2);
		expect(groups[0]?.querySelectorAll("line")).toHaveLength(1);
		expect(groups[1]?.querySelectorAll("line")).toHaveLength(2);
	});

	it("names the range for a screen reader", () => {
		render("bass", "E2", "E4");

		expect(el().querySelector("svg")?.getAttribute("aria-label")).toBe(
			"Note range from E2 to E4",
		);
	});
});
