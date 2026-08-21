import { Component, signal } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { DEFAULT_NOTE_TO_KEY_MAP } from "../../models/keymap";
import { KeyboardBindingsDialogComponent } from "./keyboard-bindings-dialog.component";

/**
 * Port of the `KeyboardBindingsDialog` half of
 * frontend-react/src/features/note-game/components/KeyboardBindings.test.tsx,
 * plus the two things React had no test for: the sign-up prompt an anonymous
 * player gets instead of the editor, and the Escape that cancels a rebind
 * without closing the dialog.
 *
 * The draft is the whole point of this component -- Cancel discards it, Save
 * emits it, and the `bindings` input is never written -- so most of these
 * drive the real editor inside it rather than a stub. That also makes the
 * Escape test the honest one: the dialog's `(document:keydown)` close handler
 * is present and listening, and deviation 12's capture-phase stream is what
 * keeps it from firing.
 */
@Component({
	imports: [KeyboardBindingsDialogComponent],
	template: `
		<app-keyboard-bindings-dialog
			[(open)]="open"
			[canEdit]="canEdit()"
			[bindings]="bindings()"
			(saveBindings)="saved.push($event)"
		/>
	`,
})
class HostComponent {
	readonly open = signal(false);
	readonly canEdit = signal(true);
	readonly bindings = signal<Record<string, string>>({
		...DEFAULT_NOTE_TO_KEY_MAP,
	});
	readonly saved: Record<string, string>[] = [];
}

describe("KeyboardBindingsDialogComponent", () => {
	let fixture: ComponentFixture<HostComponent>;
	let host: HostComponent;

	beforeEach(async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
		fixture = TestBed.createComponent(HostComponent);
		host = fixture.componentInstance;
		await fixture.whenStable();
	});

	afterEach(() => {
		TestBed.resetTestingModule();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function dialog(): HTMLElement | null {
		return el().querySelector("[role='dialog']");
	}

	function buttons(): HTMLButtonElement[] {
		return Array.from(el().querySelectorAll("button"));
	}

	function button(label: string): HTMLButtonElement {
		const found = buttons().find(
			(candidate) => candidate.textContent?.trim() === label,
		);
		if (!found) throw new Error(`no button labelled ${label}`);
		return found;
	}

	function noteButton(note: string): HTMLButtonElement {
		const found = buttons().find(
			(candidate) =>
				candidate.querySelector("span")?.textContent?.trim() === note,
		);
		if (!found) throw new Error(`no button for note ${note}`);
		return found;
	}

	function keyLabel(note: string): string {
		const spans = noteButton(note).querySelectorAll("span");
		return spans[1]?.textContent?.trim() ?? "";
	}

	async function open(): Promise<void> {
		host.open.set(true);
		await fixture.whenStable();
	}

	async function click(target: HTMLElement): Promise<void> {
		target.click();
		await fixture.whenStable();
	}

	/** A keydown from inside the page -- see the editor spec's `press`. */
	async function press(key: string): Promise<void> {
		document.body.dispatchEvent(
			new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
		);
		await fixture.whenStable();
	}

	it("renders nothing while closed", () => {
		expect(dialog()).toBeNull();
		expect(el().textContent).not.toContain("Keyboard Bindings");
	});

	it("shows the editor once opened", async () => {
		await open();

		expect(dialog()).not.toBeNull();
		expect(dialog()!.textContent).toContain("Keyboard Bindings");
		expect(el().querySelector("app-keyboard-bindings-editor")).not.toBeNull();
		expect(keyLabel("C")).toBe("a");
	});

	// React had no equivalent: the upsell lived in SettingsBar as its own
	// component, and this one folds both states into a single control.
	it("shows the sign-up prompt instead when the player cannot edit", async () => {
		host.canEdit.set(false);
		await open();

		expect(dialog()!.textContent).toContain("Customize Keyboard Input");
		expect(el().querySelector("app-keyboard-bindings-editor")).toBeNull();
		expect(el().querySelector("a")?.getAttribute("href")).toBe("/signup");
	});

	it("says it is listening in the title while a key is awaited", async () => {
		await open();
		expect(dialog()!.textContent).not.toContain("listening...");

		await click(noteButton("C"));

		expect(dialog()!.textContent).toContain("listening...");
	});

	it("closes without saving when Cancel is clicked", async () => {
		await open();

		await click(button("Cancel"));

		expect(host.open()).toBe(false);
		expect(dialog()).toBeNull();
		expect(host.saved).toEqual([]);
	});

	it("emits the bindings and closes when Save is clicked", async () => {
		await open();

		await click(button("Save"));

		expect(host.saved).toEqual([DEFAULT_NOTE_TO_KEY_MAP]);
		expect(host.open()).toBe(false);
	});

	it("saves the edited draft, and never writes the input map", async () => {
		await open();
		await click(noteButton("C"));
		await press("p");
		expect(keyLabel("C")).toBe("p");

		await click(button("Save"));

		expect(host.saved).toHaveLength(1);
		expect(host.saved[0]).toEqual({ ...DEFAULT_NOTE_TO_KEY_MAP, C: "p" });
		// The dialog owns a draft; the map the parent passed in is untouched
		// until it chooses to act on `saveBindings`.
		expect(host.bindings()).toEqual(DEFAULT_NOTE_TO_KEY_MAP);
	});

	it("discards the draft on Cancel, so re-opening starts from the saved map", async () => {
		await open();
		await click(noteButton("C"));
		await press("p");
		expect(keyLabel("C")).toBe("p");

		await click(button("Cancel"));
		await open();

		expect(keyLabel("C")).toBe("a");
		expect(host.saved).toEqual([]);
	});

	// Deviation 12, for real: the dialog's own Escape-to-close is mounted and
	// listening, and the editor's capture-phase stream is the only reason this
	// Escape does not reach it.
	it("cancels the pending rebind on Escape without closing the dialog", async () => {
		await open();
		await click(noteButton("C"));
		expect(keyLabel("C")).toBe("...");

		await press("Escape");

		expect(host.open()).toBe(true);
		expect(dialog()).not.toBeNull();
		expect(keyLabel("C")).toBe("a");

		// And with nothing armed, Escape closes the dialog as it always did.
		await press("Escape");

		expect(host.open()).toBe(false);
		expect(dialog()).toBeNull();
	});
});
