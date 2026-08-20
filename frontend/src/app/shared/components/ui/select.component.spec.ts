import { Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideIcons } from "@ng-icons/core";

import { TREMOLO_ICONS } from "../../../core/icons";
import { SelectComponent } from "./select.component";

@Component({
	imports: [SelectComponent],
	template: `
		<label for="clef">Clef</label>
		<app-select
			selectId="clef"
			[(value)]="clef"
			[error]="error()"
			[disabled]="disabled()"
		>
			<option value="treble">Treble</option>
			<option value="bass">Bass</option>
			<option value="alto">Alto</option>
		</app-select>
	`,
})
class HostComponent {
	readonly clef = signal("treble");
	readonly error = signal<string | null>(null);
	readonly disabled = signal(false);
}

/**
 * The control is a **native** `<select>` inside a positioned wrapper, which
 * is the whole point: arrow keys, type-ahead, Home/End and the platform
 * dropdown all come from the browser rather than from us, and the parity
 * suite drives it with Playwright's `selectOption`.
 *
 * jsdom implements none of that native key handling, so what is pinned
 * here is the contract that earns it: the rendered element really is a
 * `<select>`, it is focusable, it carries the id its `<label for>` points
 * at, and a selection change round-trips through the two-way `value`.
 */
describe("SelectComponent", () => {
	let fixture: ComponentFixture<HostComponent>;
	let host: HostComponent;

	beforeEach(async () => {
		TestBed.configureTestingModule({
			providers: [provideIcons(TREMOLO_ICONS)],
		});
		fixture = TestBed.createComponent(HostComponent);
		host = fixture.componentInstance;
		await fixture.whenStable();
	});

	function select(): HTMLSelectElement {
		return fixture.nativeElement.querySelector("select") as HTMLSelectElement;
	}

	it("renders a native select carrying the projected options", () => {
		expect(select().tagName).toBe("SELECT");
		expect(select().options.length).toBe(3);
		expect([...select().options].map((o) => o.value)).toEqual([
			"treble",
			"bass",
			"alto",
		]);
	});

	it("is reachable by its label, which is what keyboard focus follows", () => {
		expect(select().id).toBe("clef");

		const label = fixture.nativeElement.querySelector(
			"label",
		) as HTMLLabelElement;
		expect(label.htmlFor).toBe("clef");

		select().focus();
		expect(document.activeElement).toBe(select());
	});

	it("shows the bound value", () => {
		expect(select().value).toBe("treble");
	});

	it("writes a selection back through the two-way value", async () => {
		select().value = "bass";
		select().dispatchEvent(new Event("change"));
		await fixture.whenStable();

		expect(host.clef()).toBe("bass");
	});

	it("follows the model when the value changes from outside", async () => {
		host.clef.set("alto");
		await fixture.whenStable();

		expect(select().value).toBe("alto");
	});

	it("turns destructive when given an error", async () => {
		expect(select().className).not.toContain("border-destructive");

		host.error.set("Pick a clef");
		await fixture.whenStable();

		expect(select().className).toContain("border-destructive");
		expect(select().getAttribute("aria-invalid")).toBe("true");
	});

	it("can be disabled, which is also how Signal Forms disables it", async () => {
		expect(select().disabled).toBe(false);

		host.disabled.set(true);
		await fixture.whenStable();

		expect(select().disabled).toBe(true);
	});
});
