import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { FooterComponent } from "./footer.component";

/**
 * New in #242, extended in #264 with the Pricing link. Renders once in
 * app.component.html, outside the router outlet, the same way
 * `<app-navigation>` does -- see app.component.spec.ts for the shell-level
 * assertion that it is actually mounted there.
 */
describe("FooterComponent", () => {
	let fixture: ComponentFixture<FooterComponent>;

	beforeEach(async () => {
		TestBed.configureTestingModule({
			providers: [provideRouter([])],
		});
		fixture = TestBed.createComponent(FooterComponent);
		await fixture.whenStable();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function links(): HTMLAnchorElement[] {
		return [...el().querySelectorAll("a")];
	}

	/**
	 * e2e/specs/navigation.spec.ts asserts `page.getByRole("navigation")` is
	 * visible on every public route. A second `<nav>` in the footer would
	 * make that locator match two elements and fail with a strictness
	 * violation, so the link cluster has to stay a plain `<div>`.
	 */
	it("renders a footer landmark rather than a second nav landmark", () => {
		expect(el().querySelector("footer")).not.toBeNull();
		expect(el().querySelector("nav")).toBeNull();
	});

	it("renders the five links in order: Privacy, Terms, About, Pricing, Contact", () => {
		expect(links().map((a) => a.textContent?.trim())).toEqual([
			"Privacy",
			"Terms",
			"About",
			"Pricing",
			"Contact",
		]);
	});

	it("resolves the four internal links to their routes", () => {
		const [privacy, terms, about, pricing] = links();
		expect(privacy?.getAttribute("href")).toBe("/privacy");
		expect(terms?.getAttribute("href")).toBe("/terms");
		expect(about?.getAttribute("href")).toBe("/about");
		expect(pricing?.getAttribute("href")).toBe("/pricing");
	});

	it("makes Contact a mailto link, since no /contact route exists", () => {
		const contact = links().at(-1);
		expect(contact?.getAttribute("href")).toBe(
			"mailto:contact@tremolonotes.com",
		);
	});

	it("shows the current year in the copyright line", () => {
		expect(el().textContent).toContain(`© ${new Date().getFullYear()} Tremolo`);
	});
});
