import { Component, viewChild } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";

import { GameStaffComponent } from "./game-staff.component";

/**
 * OSMD is mocked, as in `sheet-music.component.spec.ts`, and for the same
 * reason: jsdom measures nothing. What the fake keeps is the one piece of
 * DOM shape this component depends on -- OSMD does not draw the `<svg>`
 * straight into the container it is given, it inserts a wrapper `<div>` of
 * its own first, and that wrapper is only as tall as the drawing.
 *
 * `centre()` must size the SVG from the *container*, the element the
 * caller styled, and not from that wrapper. Reading the wrapper was the
 * 2026-09-01 regression: the wrapper was 68px tall, so the SVG was told to
 * be 68px tall, and the staff drew as a thumbnail at the top of a 738px
 * card.
 */
const { FakeOsmd } = vi.hoisted(() => {
	class FakeOsmd {
		static instances: FakeOsmd[] = [];

		zoom = 1;
		readonly EngravingRules: Record<string, number> = {};
		readonly wrapper = document.createElement("div");
		readonly svg = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"svg",
		);

		constructor(
			readonly container: HTMLElement,
			readonly options?: unknown,
		) {
			FakeOsmd.instances.push(this);
		}

		load(): Promise<void> {
			return Promise.resolve();
		}

		/** Reproduces OSMD's `container > div > svg` output. */
		render(): void {
			if (!this.wrapper.parentElement) {
				this.wrapper.appendChild(this.svg);
				this.container.appendChild(this.wrapper);
			}
			this.svg.setAttribute("width", "1084");
			this.svg.setAttribute("height", "68");
		}

		optionsSet: unknown[] = [];
		clearCount = 0;

		setOptions(options: unknown): void {
			this.optionsSet.push(options);
		}

		clear(): void {
			this.clearCount++;
		}
	}

	return { FakeOsmd };
});

vi.mock("opensheetmusicdisplay", () => ({ OpenSheetMusicDisplay: FakeOsmd }));

const XML =
	'<?xml version="1.0"?><score-partwise version="4.0"></score-partwise>';

@Component({
	imports: [GameStaffComponent],
	template: `<app-game-staff />`,
})
class HostComponent {
	readonly staff = viewChild.required(GameStaffComponent);
}

/** jsdom lays nothing out; give an element a fixed client box. */
function setClientBox(el: Element, width: number, height: number): void {
	Object.defineProperty(el, "clientWidth", {
		value: width,
		configurable: true,
	});
	Object.defineProperty(el, "clientHeight", {
		value: height,
		configurable: true,
	});
}

describe("GameStaffComponent", () => {
	let fixture: ComponentFixture<HostComponent>;
	let host: HostComponent;

	beforeEach(async () => {
		FakeOsmd.instances = [];
		fixture = TestBed.createComponent(HostComponent);
		host = fixture.componentInstance;
		await fixture.whenStable();
	});

	function container(): HTMLElement {
		return fixture.nativeElement.querySelector(
			'[aria-label="Music staff"]',
		) as HTMLElement;
	}

	it("sizes the SVG to the container, not to OSMD's wrapper div", async () => {
		setClientBox(container(), 1084, 738);

		// The fake is constructed on the first load; its wrapper is measured
		// as OSMD's real one would be: as tall as the drawing only.
		const loading = host.staff().loadNote(XML);
		const osmd = FakeOsmd.instances[0]!;
		setClientBox(osmd.wrapper, 1084, 68);
		osmd.svg.getBBox = () => ({ x: 0, y: 0, width: 66, height: 68 }) as DOMRect;
		await loading;
		await fixture.whenStable();

		expect(osmd.svg.getAttribute("width")).toBe("1084");
		expect(osmd.svg.getAttribute("height")).toBe("738");
		expect(osmd.svg.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
	});
});
