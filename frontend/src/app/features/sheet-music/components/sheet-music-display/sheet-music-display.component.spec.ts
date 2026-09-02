import { Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";

import { SheetMusicDisplayComponent } from "./sheet-music-display.component";

/** Same mock rationale as sheet-music.component.spec.ts. */
const { FakeOsmd } = vi.hoisted(() => {
	class FakeOsmd {
		static instances: FakeOsmd[] = [];
		/** Held open to observe the loading state; null means resolve now. */
		static gate: Promise<void> | null = null;

		zoom = 1;
		loaded: string[] = [];
		renderCount = 0;
		clearCount = 0;

		constructor(readonly container: HTMLElement) {
			FakeOsmd.instances.push(this);
		}

		async load(xml: string): Promise<void> {
			this.loaded.push(xml);
			await (FakeOsmd.gate ?? Promise.resolve());
			if (!xml.includes("score-partwise")) throw new Error("Invalid MusicXML");
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
	imports: [SheetMusicDisplayComponent],
	template: `<app-sheet-music-display [musicXml]="xml()" />`,
})
class HostComponent {
	readonly xml = signal("");
}

describe("SheetMusicDisplayComponent", () => {
	let fixture: ComponentFixture<HostComponent>;
	let host: HostComponent;

	beforeEach(async () => {
		FakeOsmd.instances = [];
		FakeOsmd.gate = null;
		fixture = TestBed.createComponent(HostComponent);
		host = fixture.componentInstance;
		await fixture.whenStable();
	});

	function staff(): HTMLElement {
		return fixture.nativeElement.querySelector(
			"[aria-label='Sheet music display']",
		) as HTMLElement;
	}

	function text(): string {
		return fixture.nativeElement.textContent ?? "";
	}

	/**
	 * Change detection settles before OSMD's promise chain does: the effect
	 * only *starts* `loadAndRender`, and `load()` itself awaits. So the
	 * macrotask turn below is what lets the load finish before the next
	 * assertion, and `whenStable` afterwards is what renders the result.
	 */
	async function settle(): Promise<void> {
		await fixture.whenStable();
		await new Promise((resolve) => setTimeout(resolve, 0));
		await fixture.whenStable();
	}

	async function show(xml: string): Promise<void> {
		host.xml.set(xml);
		await settle();
	}

	it("loads nothing while musicXml is empty", () => {
		expect(FakeOsmd.instances).toHaveLength(0);
		expect(staff().className).toBe("min-h-[200px]");
	});

	it("loads whenever musicXml changes", async () => {
		await show(VALID_XML);
		expect(FakeOsmd.instances[0]!.loaded).toEqual([VALID_XML]);

		await show(VALID_XML.replace("4.0", "3.1"));
		expect(FakeOsmd.instances[0]!.loaded).toHaveLength(2);
	});

	it("shows the skeleton while OSMD works, and hides the staff", async () => {
		let open!: () => void;
		FakeOsmd.gate = new Promise<void>((resolve) => {
			open = resolve;
		});

		await show(VALID_XML);

		expect(text()).toContain("Loading sheet music...");
		expect(staff().className).toContain("hidden");

		open();
		FakeOsmd.gate = null;
		await settle();

		expect(text()).not.toContain("Loading sheet music...");
		expect(staff().className).not.toContain("hidden");
	});

	it("shows the error panel, not a blank stave, when rendering fails", async () => {
		await show(INVALID_XML);

		expect(text()).toContain("Failed to render sheet music");
		expect(text()).toContain("Invalid MusicXML");
		expect(staff().className).toContain("hidden");
	});

	it("re-shows the staff when a later load succeeds", async () => {
		await show(INVALID_XML);
		await show(VALID_XML);

		expect(text()).not.toContain("Failed to render sheet music");
		expect(staff().className).not.toContain("hidden");
	});
});
