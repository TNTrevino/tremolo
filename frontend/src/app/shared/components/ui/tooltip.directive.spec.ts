import { Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";

import { TOOLTIP_HIDE_DELAY_MS, TooltipDirective } from "./tooltip.directive";

@Component({
	imports: [TooltipDirective],
	template: `
		<button type="button" [appTooltip]="label()">Play</button>
		<span [appTooltip]="label()">
			<button type="button">Replay</button>
		</span>
	`,
})
class HostComponent {
	readonly label = signal("Play the exercise");
}

/** A `getBoundingClientRect` result, since jsdom measures everything as 0. */
function rect(
	left: number,
	top: number,
	width: number,
	height: number,
): DOMRect {
	return {
		x: left,
		y: top,
		left,
		top,
		width,
		height,
		right: left + width,
		bottom: top + height,
		toJSON: () => ({}),
	} as DOMRect;
}

/**
 * Real timers, like the rest of the kit's specs. The only wait is the
 * 100 ms SC 1.4.13 grace period, and faking the clock here would also fake
 * the one the zoneless fixture settles on.
 */
describe("TooltipDirective", () => {
	let fixture: ComponentFixture<HostComponent>;
	let host: HostComponent;

	beforeEach(async () => {
		fixture = TestBed.createComponent(HostComponent);
		host = fixture.componentInstance;
		await fixture.whenStable();
	});

	afterEach(() => {
		fixture.destroy();
	});

	function button(): HTMLButtonElement {
		return fixture.nativeElement.querySelector("button") as HTMLButtonElement;
	}

	/** A boxless host, standing in for a `display: contents` kit component. */
	function wrapper(): HTMLElement {
		return fixture.nativeElement.querySelector("span") as HTMLElement;
	}

	function inner(): HTMLButtonElement {
		return wrapper().querySelector("button") as HTMLButtonElement;
	}

	/** The bubble lives on `document.body`, not inside the fixture. */
	function bubble(): HTMLElement | null {
		return document.body.querySelector("[role='tooltip']");
	}

	function wait(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/** Past the hoverable grace period, with room to spare. */
	function afterHideDelay(): Promise<void> {
		return wait(TOOLTIP_HIDE_DELAY_MS + 50);
	}

	async function fire(target: EventTarget, event: Event): Promise<void> {
		target.dispatchEvent(event);
		await fixture.whenStable();
	}

	async function hover(): Promise<void> {
		await fire(button(), new MouseEvent("mouseenter"));
	}

	it("renders nothing until the host is hovered or focused", () => {
		expect(bubble()).toBeNull();
	});

	it("shows a labelled tooltip on mouseenter", async () => {
		await hover();

		expect(bubble()).not.toBeNull();
		expect(bubble()!.getAttribute("role")).toBe("tooltip");
		expect(bubble()!.textContent).toBe("Play the exercise");
		expect(bubble()!.parentElement).toBe(document.body);
	});

	it("removes the tooltip on mouseleave, after the grace period", async () => {
		await hover();
		await fire(button(), new MouseEvent("mouseleave"));

		// SC 1.4.13 hoverable: still there, so the pointer can reach it.
		expect(bubble()).not.toBeNull();

		await afterHideDelay();
		expect(bubble()).toBeNull();
	});

	it("stays up while the pointer is on the bubble itself", async () => {
		await hover();
		await fire(button(), new MouseEvent("mouseleave"));
		await fire(bubble()!, new MouseEvent("mouseenter"));

		await afterHideDelay();
		expect(bubble()).not.toBeNull();

		await fire(bubble()!, new MouseEvent("mouseleave"));
		await afterHideDelay();
		expect(bubble()).toBeNull();
	});

	it("shows on keyboard focus and hides on blur", async () => {
		// A real focus, not a synthesized `focusin`: jsdom fires the event
		// itself and reports `:focus-visible`, so this exercises the gate
		// rather than stepping around it.
		button().focus();
		await fixture.whenStable();
		expect(bubble()).not.toBeNull();

		button().blur();
		await fixture.whenStable();
		expect(bubble()).toBeNull();
	});

	it("dismisses on Escape without moving pointer or focus", async () => {
		await hover();

		await fire(document, new KeyboardEvent("keydown", { key: "Escape" }));

		expect(bubble()).toBeNull();
	});

	it("ignores other keys", async () => {
		await hover();

		await fire(document, new KeyboardEvent("keydown", { key: "Enter" }));

		expect(bubble()).not.toBeNull();
	});

	it("describes the host while visible and cleans the attribute up", async () => {
		await hover();

		expect(button().getAttribute("aria-describedby")).toBe(bubble()!.id);

		await fire(button(), new MouseEvent("mouseleave"));
		await afterHideDelay();

		expect(button().hasAttribute("aria-describedby")).toBe(false);
	});

	it("preserves and restores an existing aria-describedby", async () => {
		button().setAttribute("aria-describedby", "host-help");

		await hover();
		expect(button().getAttribute("aria-describedby")).toBe(
			`host-help ${bubble()!.id}`,
		);

		await fire(button(), new MouseEvent("mouseleave"));
		await afterHideDelay();

		expect(button().getAttribute("aria-describedby")).toBe("host-help");
	});

	it("is inert when the label is empty", async () => {
		host.label.set("   ");
		await fixture.whenStable();

		await hover();

		expect(bubble()).toBeNull();
		expect(button().hasAttribute("aria-describedby")).toBe(false);
	});

	it("anchors to the rendered child when the host has no box", async () => {
		// What `<app-button>` and the other `display: contents` kit hosts
		// look like: the host element itself measures 0x0 and is not the
		// control a screen reader lands on.
		inner().getBoundingClientRect = () => rect(100, 200, 80, 40);

		await fire(wrapper(), new MouseEvent("mouseenter"));

		// 200 (inner top) - 0 (bubble height in jsdom) - 8 (gap).
		expect(bubble()!.style.top).toBe("192px");
		// 100 + 80 / 2, centered on a zero-width bubble.
		expect(bubble()!.style.left).toBe("140px");
		expect(inner().getAttribute("aria-describedby")).toBe(bubble()!.id);
		expect(wrapper().hasAttribute("aria-describedby")).toBe(false);

		await fire(wrapper(), new MouseEvent("mouseleave"));
		await afterHideDelay();

		expect(inner().hasAttribute("aria-describedby")).toBe(false);
	});

	it("rewrites an open bubble when the label changes", async () => {
		await hover();

		host.label.set("Stop the exercise");
		await fixture.whenStable();

		expect(bubble()!.textContent).toBe("Stop the exercise");
	});

	it("hides an open bubble when the label empties", async () => {
		await hover();

		host.label.set("");
		await fixture.whenStable();

		expect(bubble()).toBeNull();
		expect(button().hasAttribute("aria-describedby")).toBe(false);
	});

	it("removes the bubble when the directive is destroyed", async () => {
		await hover();
		expect(bubble()).not.toBeNull();

		fixture.destroy();

		expect(bubble()).toBeNull();
	});
});
