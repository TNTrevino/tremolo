import { Component, signal } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";

import { DEFAULT_NOTE_TO_KEY_MAP } from "../../models/keymap";
import { KeyboardBindingsEditorComponent } from "./keyboard-bindings-editor.component";

/**
 * Port of the `KeyboardBindingsEditor` half of
 * frontend-react/src/features/note-game/components/KeyboardBindings.test.tsx.
 *
 * React's props became a two-way `model()` plus one output, so the "calls
 * onChange with ..." assertions are now assertions about the host's own
 * signal -- the map the parent holds is the map the editor writes.
 *
 * The test this file exists for is the capture-phase one. Deviation 12 of
 * `.migration/phase-6-handoff.md` keeps React's `{ capture: true }` listener
 * as an RxJS stream precisely so `stopPropagation()` beats every bubble-phase
 * listener on `document` -- `<app-dialog>`'s Escape-to-close above all. That
 * is invisible in the rendered output and was the one behaviour the React
 * suite never pinned, so it is pinned here twice: once against a plain bubble
 * listener, and once for real in the dialog's own spec.
 */
@Component({
	imports: [KeyboardBindingsEditorComponent],
	template: `
		<app-keyboard-bindings-editor
			[(bindings)]="bindings"
			(listeningChange)="onListeningChange($event)"
		/>
	`,
})
class HostComponent {
	readonly bindings = signal<Record<string, string>>({
		...DEFAULT_NOTE_TO_KEY_MAP,
	});

	/** Every `listeningChange` in order -- React asserted on the last one. */
	readonly listeningCalls: (string | null)[] = [];

	onListeningChange(note: string | null): void {
		this.listeningCalls.push(note);
	}
}

describe("KeyboardBindingsEditorComponent", () => {
	let fixture: ComponentFixture<HostComponent>;
	let host: HostComponent;

	beforeEach(async () => {
		fixture = TestBed.createComponent(HostComponent);
		host = fixture.componentInstance;
		await fixture.whenStable();
	});

	function buttons(): HTMLButtonElement[] {
		return Array.from(
			(fixture.nativeElement as HTMLElement).querySelectorAll("button"),
		);
	}

	/** The note button labelled `note` -- its first span is the note name. */
	function noteButton(note: string): HTMLButtonElement {
		const button = buttons().find(
			(candidate) =>
				candidate.querySelector("span")?.textContent?.trim() === note,
		);
		if (!button) throw new Error(`no button for note ${note}`);
		return button;
	}

	/** What the button prints under the note: its key, "---", or "..." . */
	function keyLabel(note: string): string {
		const spans = noteButton(note).querySelectorAll("span");
		return spans[1]?.textContent?.trim() ?? "";
	}

	async function arm(note: string): Promise<void> {
		noteButton(note).click();
		await fixture.whenStable();
	}

	/**
	 * A keydown from inside the page rather than on `document` itself: the
	 * capture listener only gets to run *before* the bubble ones when the
	 * target is below `document` in the tree.
	 */
	async function press(key: string): Promise<void> {
		document.body.dispatchEvent(
			new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
		);
		await fixture.whenStable();
	}

	it("renders the three rows, all 21 notes, and their keys", () => {
		const text = (fixture.nativeElement as HTMLElement).textContent ?? "";

		expect(text).toContain("Sharps");
		expect(text).toContain("Naturals");
		expect(text).toContain("Flats");
		// 21 notes plus Reset to Defaults, exactly as React counted them.
		expect(buttons()).toHaveLength(22);
		expect(keyLabel("C")).toBe("a");
		expect(keyLabel("C#")).toBe("q");
		expect(keyLabel("Cb")).toBe("z");
	});

	it("arms a note when it is clicked, and says which", async () => {
		await arm("C");

		expect(keyLabel("C")).toBe("...");
		expect(host.listeningCalls).toEqual(["C"]);
	});

	it("binds the next key to the armed note and stands down", async () => {
		await arm("C");
		await press("p");

		expect(host.bindings()["C"]).toBe("p");
		expect(keyLabel("C")).toBe("p");
		expect(host.listeningCalls.at(-1)).toBeNull();
	});

	it("binds to the note that was armed, not to some other one", async () => {
		await arm("Eb");
		await press("p");

		expect(host.bindings()).toEqual({ ...DEFAULT_NOTE_TO_KEY_MAP, Eb: "p" });
	});

	it("ignores keys while no note is armed", async () => {
		await press("p");

		expect(host.bindings()).toEqual(DEFAULT_NOTE_TO_KEY_MAP);
		expect(host.listeningCalls).toEqual([]);
	});

	// The swap is what keeps the map total: 21 notes, 21 keys, no note left
	// holding nothing because another one took its key.
	it("swaps with the note that already owned the pressed key", async () => {
		await arm("C");
		await press("s");

		expect(host.bindings()).toEqual({
			...DEFAULT_NOTE_TO_KEY_MAP,
			// C takes D's key, and D inherits the "a" C was using.
			C: "s",
			D: "a",
		});
		expect(keyLabel("C")).toBe("s");
		expect(keyLabel("D")).toBe("a");
	});

	it("cancels on Escape, leaving the map untouched", async () => {
		await arm("C");
		await press("Escape");

		expect(keyLabel("C")).toBe("a");
		expect(host.bindings()).toEqual(DEFAULT_NOTE_TO_KEY_MAP);
		expect(host.listeningCalls.at(-1)).toBeNull();
	});

	// Deviation 12. The Escape that cancels a rebind must not go on to reach
	// anything else -- in the app that "anything else" is the dialog's own
	// Escape-to-close, and cancelling a rebind would close the whole dialog.
	it("swallows the cancelling Escape before any bubble listener sees it", async () => {
		const bubbled: string[] = [];
		const listener = (event: Event): void => {
			bubbled.push((event as KeyboardEvent).key);
		};
		document.addEventListener("keydown", listener);

		try {
			await arm("C");
			await press("Escape");

			expect(bubbled).toEqual([]);

			// Control: with nothing armed the stream is filtered out, so the
			// very same Escape reaches the listener normally. Without this the
			// assertion above would also pass on a listener that never fires.
			await press("Escape");
			expect(bubbled).toEqual(["Escape"]);
		} finally {
			document.removeEventListener("keydown", listener);
		}
	});

	it("swallows the key it binds too, so it cannot also answer the question", async () => {
		const bubbled: string[] = [];
		const listener = (event: Event): void => {
			bubbled.push((event as KeyboardEvent).key);
		};
		document.addEventListener("keydown", listener);

		try {
			await arm("C");
			await press("p");

			expect(bubbled).toEqual([]);
			expect(host.bindings()["C"]).toBe("p");
		} finally {
			document.removeEventListener("keydown", listener);
		}
	});

	it("restores every default key when Reset is clicked", async () => {
		await arm("C");
		await press("p");
		expect(host.bindings()).not.toEqual(DEFAULT_NOTE_TO_KEY_MAP);

		const reset = buttons().find((candidate) =>
			candidate.textContent?.includes("Reset to Defaults"),
		);
		reset!.click();
		await fixture.whenStable();

		expect(host.bindings()).toEqual(DEFAULT_NOTE_TO_KEY_MAP);
		// A copy, not the shared table -- the next edit must not mutate it.
		expect(host.bindings()).not.toBe(DEFAULT_NOTE_TO_KEY_MAP);
		expect(keyLabel("C")).toBe("a");
	});
});
