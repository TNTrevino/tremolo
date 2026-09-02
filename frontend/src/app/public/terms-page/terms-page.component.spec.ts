import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { TermsPageComponent } from "./terms-page.component";

/**
 * The terms of service, reachable signed out, with no service and no
 * request. Same pattern as privacy-page.component.spec.ts: the section list
 * is asserted as an ordered array so a dropped or reordered section fails
 * here instead of only showing up in a screenshot diff.
 */
describe("TermsPageComponent", () => {
	let fixture: ComponentFixture<TermsPageComponent>;
	let backend: HttpTestingController;

	beforeEach(async () => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
			],
		});
		backend = TestBed.inject(HttpTestingController);
		fixture = TestBed.createComponent(TermsPageComponent);
		await fixture.whenStable();
	});

	afterEach(() => {
		backend.verify();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	/**
	 * Prettier reflows long paragraphs onto multiple source lines, so raw
	 * `textContent` can carry a newline where the source has a plain space.
	 * Collapsing whitespace keeps these assertions independent of exactly
	 * where those wraps land.
	 */
	function normalized(text: string | null): string {
		return (text ?? "").replace(/\s+/g, " ").trim();
	}

	function textOf(selector: string): string[] {
		return [...el().querySelectorAll(selector)].map((node) =>
			normalized(node.textContent),
		);
	}

	function pageText(): string {
		return normalized(el().textContent);
	}

	it("renders the page heading and the last-updated date", () => {
		expect(el().querySelector("h1")?.textContent?.trim()).toBe(
			"Terms of Service",
		);
		expect(pageText()).toContain("Last updated:");
	});

	it("renders every section in order, so a dropped section fails here", () => {
		expect(textOf("h2")).toEqual([
			"The short version",
			"Who may use Tremolo",
			"Your account",
			"Using the site",
			"If you are a teacher",
			"Your data and our content",
			"Availability, and the fact that this is early software",
			"Ending it",
			"Changes",
			"Governing law",
			"Contact",
		]);
	});

	it("renders the contact address", () => {
		expect(pageText()).toContain("contact@tremolonotes.com");
	});

	it("makes no request -- the page is static copy", () => {
		backend.verify();
	});
});
