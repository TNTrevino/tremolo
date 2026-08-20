import { Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";

import {
	ButtonComponent,
	type ButtonSize,
	type ButtonVariant,
} from "./button.component";

/** Port of frontend-react/src/shared/components/ui/button.test.tsx. */
@Component({
	imports: [ButtonComponent],
	template: `
		<app-button
			[variant]="variant()"
			[size]="size()"
			[loading]="loading()"
			[disabled]="disabled()"
			[className]="className()"
			(click)="clicks.set(clicks() + 1)"
		>
			Click me
		</app-button>
	`,
})
class HostComponent {
	readonly variant = signal<ButtonVariant>("default");
	readonly size = signal<ButtonSize>("default");
	readonly loading = signal(false);
	readonly disabled = signal(false);
	readonly className = signal("");
	readonly clicks = signal(0);
}

describe("ButtonComponent", () => {
	let fixture: ComponentFixture<HostComponent>;
	let host: HostComponent;

	beforeEach(async () => {
		fixture = TestBed.createComponent(HostComponent);
		host = fixture.componentInstance;
		await fixture.whenStable();
	});

	function button(): HTMLButtonElement {
		return fixture.nativeElement.querySelector("button") as HTMLButtonElement;
	}

	async function set(apply: () => void): Promise<void> {
		apply();
		await fixture.whenStable();
	}

	it("renders a real button with its projected content", () => {
		expect(button()).not.toBeNull();
		expect(button().textContent?.trim()).toBe("Click me");
	});

	it("renders the default variant and size", () => {
		expect(button().className).toContain("bg-primary");
		expect(button().className).toContain("h-10");
	});

	it.each([
		["default", ["bg-primary", "text-primary-foreground"]],
		["brass", ["bg-brass", "text-brass-foreground"]],
		["destructive", ["bg-destructive", "text-destructive-foreground"]],
		["outline", ["border-2", "bg-background"]],
		["secondary", ["bg-secondary"]],
		["ghost", ["hover:bg-accent"]],
		["link", ["text-primary", "underline-offset-4"]],
	] as [ButtonVariant, string[]][])(
		"renders the %s variant",
		async (variant, classes) => {
			await set(() => host.variant.set(variant));

			for (const cls of classes) expect(button().className).toContain(cls);
		},
	);

	it.each([
		["sm", ["h-9", "px-3"]],
		["default", ["h-10", "px-4"]],
		["lg", ["h-11", "px-8"]],
		["xl", ["h-14", "px-10"]],
		["icon", ["h-10", "w-10"]],
	] as [ButtonSize, string[]][])(
		"renders the %s size",
		async (size, classes) => {
			await set(() => host.size.set(size));

			for (const cls of classes) expect(button().className).toContain(cls);
		},
	);

	it("shows a spinner and replaces the content while loading", async () => {
		await set(() => host.loading.set(true));

		expect(button().textContent).toContain("Loading...");
		expect(button().textContent).not.toContain("Click me");
		expect(button().querySelector("svg")).not.toBeNull();
	});

	it("is disabled while loading", async () => {
		await set(() => host.loading.set(true));

		expect(button().disabled).toBe(true);
	});

	it("is disabled when told to be", async () => {
		await set(() => host.disabled.set(true));

		expect(button().disabled).toBe(true);
		expect(button().className).toContain("disabled:pointer-events-none");
		expect(button().className).toContain("disabled:opacity-50");
	});

	it("relays clicks to the host", async () => {
		button().click();
		await fixture.whenStable();

		expect(host.clicks()).toBe(1);
	});

	it("does not relay clicks while disabled", async () => {
		await set(() => host.disabled.set(true));

		button().click();
		await fixture.whenStable();

		expect(host.clicks()).toBe(0);
	});

	it("does not relay clicks while loading", async () => {
		await set(() => host.loading.set(true));

		button().click();
		await fixture.whenStable();

		expect(host.clicks()).toBe(0);
	});

	it("merges extra classes, with the caller winning a conflict", async () => {
		await set(() => host.className.set("custom-class h-14"));

		expect(button().className).toContain("custom-class");
		expect(button().className).toContain("h-14");
		// tailwind-merge drops the variant's own height rather than leaving
		// two competing utilities on the element.
		expect(button().className).not.toContain("h-10");
	});

	it("defaults to type=button so a bare button never submits a form", () => {
		expect(button().getAttribute("type")).toBe("button");
	});
});
