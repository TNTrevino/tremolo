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

	it("draws the treble clef anchored to the G line", () => {
		render("treble", "C4", "C6");

		// The G line is the second line up, three line-spacings below the top.
		const scale = LINE_SPACING / CLEF_UNITS_PER_SPACE;
		expect(clefEl().getAttribute("d")).toBe(CLEF_PATHS.treble.d);
		expect(clefEl().getAttribute("transform")).toBe(
			`translate(${CLEF_X} ${STAFF_TOP + 3 * LINE_SPACING}) scale(${scale})`,
		);
	});

	it("draws the bass clef anchored to the F line", () => {
		render("bass", "E2", "E4");

		// The F line is the second line down, one line-spacing below the top,
		// and is the line the clef's two dots straddle.
		const scale = LINE_SPACING / CLEF_UNITS_PER_SPACE;
		expect(clefEl().getAttribute("d")).toBe(CLEF_PATHS.bass.d);
		expect(clefEl().getAttribute("transform")).toBe(
			`translate(${CLEF_X} ${STAFF_TOP + LINE_SPACING}) scale(${scale})`,
		);
	});

	it("keeps the clef inside the staff lines", () => {
		render("treble", "C4", "C6");

		// The lines start 30px left of staffLeft and the clef 28px left, so the
		// glyph sits on the staff rather than beside it. This is the whole
		// difference the screenshots show.
		const firstLine = el().querySelector<SVGLineElement>("svg > line");
		expect(Number(firstLine?.getAttribute("x1"))).toBe(STAFF_LEFT - 30);
		expect(CLEF_X).toBeGreaterThan(STAFF_LEFT - 30);
	});

	it("swaps the glyph when the clef changes", () => {
		render("treble", "C4", "C6");
		expect(clefEl().getAttribute("d")).toBe(CLEF_PATHS.treble.d);

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
