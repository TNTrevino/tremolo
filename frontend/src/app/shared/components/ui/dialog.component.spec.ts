import { Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";

import { DIALOG_DIRECTIVES } from "./dialog.component";

@Component({
	imports: [...DIALOG_DIRECTIVES],
	template: `
		<app-dialog [(open)]="open">
			<div appDialogContent>
				<div appDialogHeader><h2 appDialogTitle>Archive class</h2></div>
				<div appDialogFooter>
					<button type="button">Cancel</button>
				</div>
			</div>
		</app-dialog>
	`,
})
class HostComponent {
	readonly open = signal(false);
}

describe("DialogComponent", () => {
	let fixture: ComponentFixture<HostComponent>;
	let host: HostComponent;

	beforeEach(async () => {
		fixture = TestBed.createComponent(HostComponent);
		host = fixture.componentInstance;
		await fixture.whenStable();
	});

	function dialog(): HTMLElement | null {
		return fixture.nativeElement.querySelector("[role='dialog']");
	}

	function overlay(): HTMLElement {
		return fixture.nativeElement.querySelector(
			"[role='button']",
		) as HTMLElement;
	}

	async function open(): Promise<void> {
		host.open.set(true);
		await fixture.whenStable();
	}

	it("renders nothing while closed", () => {
		expect(dialog()).toBeNull();
		expect(document.body.classList.contains("overflow-hidden")).toBe(false);
	});

	it("renders a modal dialog when opened, and locks body scroll", async () => {
		await open();

		expect(dialog()).not.toBeNull();
		expect(dialog()!.getAttribute("aria-modal")).toBe("true");
		expect(dialog()!.textContent).toContain("Archive class");
		expect(document.body.classList.contains("overflow-hidden")).toBe(true);
	});

	it("closes when the backdrop itself is clicked", async () => {
		await open();

		overlay().dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await fixture.whenStable();

		expect(host.open()).toBe(false);
		expect(dialog()).toBeNull();
	});

	it("stays open when a click lands inside the dialog", async () => {
		await open();

		dialog()!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await fixture.whenStable();

		expect(host.open()).toBe(true);
	});

	it("closes on Escape from anywhere in the document", async () => {
		await open();

		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		await fixture.whenStable();

		expect(host.open()).toBe(false);
	});

	it("ignores other keys", async () => {
		await open();

		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
		await fixture.whenStable();

		expect(host.open()).toBe(true);
	});

	it("releases the body scroll lock when it closes", async () => {
		await open();
		host.open.set(false);
		await fixture.whenStable();

		expect(document.body.classList.contains("overflow-hidden")).toBe(false);
	});
});
