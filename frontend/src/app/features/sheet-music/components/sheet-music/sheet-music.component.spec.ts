import { Component, signal, viewChild } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";

import { SheetMusicComponent } from "./sheet-music.component";

/**
 * OSMD is mocked here, deliberately.
 *
 * The real library measures glyphs through SVG `getBBox` and canvas text
 * metrics, neither of which jsdom implements -- a unit test that loaded the
 * real thing would be testing jsdom's gaps. What this file pins is the
 * wrapper's contract: which OSMD calls happen in which order, and what the
 * signals and outputs do around them. That the real OSMD draws a real staff
 * is a browser question, and the E2E suite's `expectStaffRendered` is what
 * asks it.
 */
const { FakeOsmd } = vi.hoisted(() => {
	class FakeOsmd {
		static instances: FakeOsmd[] = [];
		/** Set to throw from the constructor for the init-failure test. */
		static failToConstruct = false;

		zoom = 1;
		loaded: string[] = [];
		renderCount = 0;
		clearCount = 0;

		constructor(
			readonly container: HTMLElement,
			readonly options?: unknown,
		) {
			if (FakeOsmd.failToConstruct) {
				throw new Error("WebGL is not available");
			}
			FakeOsmd.instances.push(this);
		}

		/**
		 * Stands in for OSMD's XML parse: anything that is not a partwise
		 * score rejects, which is what the real library does with a string
		 * that is not MusicXML.
		 */
		load(xml: string): Promise<void> {
			this.loaded.push(xml);
			return xml.includes("score-partwise")
				? Promise.resolve()
				: Promise.reject(new Error("Invalid MusicXML"));
		}

		render(): void {
			this.renderCount++;
		}

		clear(): void {
			this.clearCount++;
		}
	}

	return { FakeOsmd };
});

vi.mock("opensheetmusicdisplay", () => ({ OpenSheetMusicDisplay: FakeOsmd }));

const VALID_XML =
	'<?xml version="1.0"?><score-partwise version="4.0"></score-partwise>';
const INVALID_XML = "not xml at all";

@Component({
	imports: [SheetMusicComponent],
	template: `
		<app-sheet-music
			[zoom]="zoom()"
			[ariaLabel]="ariaLabel()"
			(renderComplete)="completions.set(completions() + 1)"
			(renderError)="failures.set([...failures(), $event])"
		/>
	`,
})
class HostComponent {
	readonly sheet = viewChild.required(SheetMusicComponent);
	readonly zoom = signal(1);
	readonly ariaLabel = signal("Sheet music display");
	readonly completions = signal(0);
	readonly failures = signal<Error[]>([]);
}

describe("SheetMusicComponent", () => {
	let fixture: ComponentFixture<HostComponent>;
	let host: HostComponent;

	beforeEach(async () => {
		FakeOsmd.instances = [];
		FakeOsmd.failToConstruct = false;
		fixture = TestBed.createComponent(HostComponent);
		host = fixture.componentInstance;
		await fixture.whenStable();
	});

	function osmd(): InstanceType<typeof FakeOsmd> {
		expect(FakeOsmd.instances.length).toBeGreaterThan(0);
		return FakeOsmd.instances[FakeOsmd.instances.length - 1]!;
	}

	function container(): HTMLElement {
		return fixture.nativeElement.querySelector("div") as HTMLElement;
	}

	async function load(xml: string): Promise<void> {
		await host.sheet().loadAndRender(xml);
		await fixture.whenStable();
	}

	it("renders the container with its accessible name, and nothing else", () => {
		expect(container()).not.toBeNull();
		expect(container().getAttribute("aria-label")).toBe("Sheet music display");
		// The chrome is the caller's; this component draws one div.
		expect(fixture.nativeElement.querySelectorAll("div").length).toBe(1);
	});

	it("does not construct OSMD until something is loaded", () => {
		expect(FakeOsmd.instances).toHaveLength(0);
	});

	it("renders valid MusicXML and reports completion", async () => {
		await load(VALID_XML);

		expect(osmd().container).toBe(container());
		expect(osmd().loaded).toEqual([VALID_XML]);
		expect(osmd().renderCount).toBe(1);
		expect(host.completions()).toBe(1);
		expect(host.sheet().error()).toBeNull();
		expect(host.sheet().isLoading()).toBe(false);
	});

	it("sets the error signal when the XML will not parse", async () => {
		await load(INVALID_XML);

		expect(host.sheet().error()).toBeInstanceOf(Error);
		expect(host.sheet().error()!.message).toBe("Invalid MusicXML");
		expect(osmd().renderCount).toBe(0);
		expect(host.completions()).toBe(0);
	});

	it("emits renderError, and never rejects, on a bad load", async () => {
		// The React hook swallowed the rejection in `.catch`; callers read
		// the signal or the output instead of catching.
		await expect(
			host.sheet().loadAndRender(INVALID_XML),
		).resolves.toBeUndefined();
		await fixture.whenStable();

		expect(host.failures()).toHaveLength(1);
		expect(host.failures()[0]!.message).toBe("Invalid MusicXML");
	});

	it("leaves isLoading false once a failed load settles", async () => {
		await load(INVALID_XML);

		expect(host.sheet().isLoading()).toBe(false);
	});

	it("clears a previous error when a later load succeeds", async () => {
		await load(INVALID_XML);
		expect(host.sheet().error()).not.toBeNull();

		await load(VALID_XML);

		expect(host.sheet().error()).toBeNull();
		expect(host.completions()).toBe(1);
	});

	it("reuses the one OSMD instance across loads", async () => {
		await load(VALID_XML);
		await load(VALID_XML);

		expect(FakeOsmd.instances).toHaveLength(1);
		expect(osmd().renderCount).toBe(2);
	});

	it("clear() empties the display and resets the error", async () => {
		await load(INVALID_XML);

		host.sheet().clear();
		await fixture.whenStable();

		expect(osmd().clearCount).toBe(1);
		expect(host.sheet().error()).toBeNull();
	});

	it("applies zoom at construction and again when it changes", async () => {
		host.zoom.set(2.2);
		await fixture.whenStable();

		await load(VALID_XML);
		expect(osmd().zoom).toBe(2.2);
		expect(osmd().renderCount).toBe(1);

		host.zoom.set(1.4);
		await fixture.whenStable();

		expect(osmd().zoom).toBe(1.4);
		// Re-drawn in place: the score is still loaded, nothing refetched.
		expect(osmd().renderCount).toBe(2);
		expect(osmd().loaded).toHaveLength(1);
	});

	it("does not render on a zoom change before anything is loaded", async () => {
		host.zoom.set(1.8);
		await fixture.whenStable();

		expect(FakeOsmd.instances).toHaveLength(0);
	});

	it("disposes the instance on destroy", async () => {
		await load(VALID_XML);
		const instance = osmd();

		fixture.destroy();

		expect(instance.clearCount).toBe(1);
	});

	it("records a constructor failure instead of throwing", async () => {
		FakeOsmd.failToConstruct = true;

		await load(VALID_XML);

		expect(host.sheet().error()!.message).toBe("WebGL is not available");
		expect(host.failures()).toHaveLength(1);
		expect(host.sheet().isLoading()).toBe(false);
	});
});
