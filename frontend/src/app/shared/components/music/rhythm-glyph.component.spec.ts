import { Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";

import {
	describeRhythm,
	RhythmGlyphComponent,
	type RhythmType,
} from "./rhythm-glyph.component";

/** Port of frontend-react/src/shared/components/music/RhythmGlyph.test.tsx. */
@Component({
	imports: [RhythmGlyphComponent],
	template: `<app-rhythm-glyph
		[rhythm]="rhythm()"
		[rhythmType]="rhythmType()"
	/>`,
})
class HostComponent {
	readonly rhythm = signal("1111");
	readonly rhythmType = signal<RhythmType>(16);
}

describe("describeRhythm", () => {
	it("names notes and rests by duration", () => {
		expect(describeRhythm("112", 16)).toBe(
			"sixteenth note, sixteenth note, eighth note",
		);
		expect(describeRhythm("01", 8)).toBe("eighth rest, eighth note");
	});
});

describe("RhythmGlyph beaming", () => {
	let fixture: ComponentFixture<HostComponent>;
	let host: HostComponent;

	beforeEach(async () => {
		fixture = TestBed.createComponent(HostComponent);
		host = fixture.componentInstance;
		await fixture.whenStable();
	});

	async function parts(rhythm: string, rhythmType: RhythmType) {
		host.rhythm.set(rhythm);
		host.rhythmType.set(rhythmType);
		await fixture.whenStable();

		const el = fixture.nativeElement as HTMLElement;
		return {
			heads: el.querySelectorAll("ellipse").length,
			beams: el.querySelectorAll("rect").length,
			flags: el.querySelectorAll("path").length,
			rests: el.querySelectorAll("text").length,
		};
	}

	it("four sixteenths: full double beam, no flags or rests", async () => {
		// primary beam + three full sixteenth segments
		expect(await parts("1111", 16)).toEqual({
			heads: 4,
			beams: 4,
			flags: 0,
			rests: 0,
		});
	});

	it("sixteenth-eighth-sixteenth: primary beam plus two partial stubs", async () => {
		expect(await parts("121", 16)).toEqual({
			heads: 3,
			beams: 3,
			flags: 0,
			rests: 0,
		});
	});

	it("eighth then two sixteenths: one full sixteenth segment", async () => {
		// primary + one full segment between the two sixteenths
		expect(await parts("211", 16)).toEqual({
			heads: 3,
			beams: 2,
			flags: 0,
			rests: 0,
		});
	});

	it("rest then three sixteenths: rest breaks nothing that follows", async () => {
		// primary + two full segments, one rest glyph
		expect(await parts("0111", 16)).toEqual({
			heads: 3,
			beams: 3,
			flags: 0,
			rests: 1,
		});
	});

	it("isolated eighth gets a flag, not a beam", async () => {
		expect(await parts("10", 8)).toEqual({
			heads: 1,
			beams: 0,
			flags: 1,
			rests: 1,
		});
	});

	it("two eighths share a single beam", async () => {
		expect(await parts("11", 8)).toEqual({
			heads: 2,
			beams: 1,
			flags: 0,
			rests: 0,
		});
	});

	it("labels itself for screen readers", async () => {
		await parts("112", 16);

		const svg = fixture.nativeElement.querySelector("svg") as SVGElement;
		expect(svg.getAttribute("role")).toBe("img");
		expect(svg.getAttribute("aria-label")).toBe(
			"sixteenth note, sixteenth note, eighth note",
		);
	});
});
