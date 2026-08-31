import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { PrivacyPageComponent } from "./privacy-page.component";

/**
 * The privacy policy is static copy, reachable signed out, with no service
 * and no request -- same shape as `AboutPageComponent`. The section list is
 * asserted as an ordered array so a dropped or reordered section fails here
 * instead of only showing up in a screenshot diff (about-page.component.spec.ts
 * is the pattern this borrows).
 */
describe("PrivacyPageComponent", () => {
	let fixture: ComponentFixture<PrivacyPageComponent>;
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
		fixture = TestBed.createComponent(PrivacyPageComponent);
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
			"Privacy Policy",
		);
		expect(pageText()).toContain("Last updated:");
	});

	it("renders every section in order, so a dropped section fails here", () => {
		expect(textOf("h2")).toEqual([
			"Who we are",
			"What we collect",
			"What we do not collect",
			"Why we collect it",
			"We do not sell your information, and we do not advertise",
			"Who can see what",
			"Where your information lives",
			"Email",
			"How long we keep it",
			"Students under 13 (COPPA)",
			"Schools and FERPA",
			"Your choices",
			"Changes to this policy",
			"Contact",
		]);
	});

	it("states plainly that student information is not for sale", () => {
		expect(pageText()).toContain(
			"We do not sell, rent, or trade student information.",
		);
	});

	it("has a COPPA section for students under 13", () => {
		expect(textOf("h2")).toContain("Students under 13 (COPPA)");
	});

	it("renders the contact address", () => {
		expect(pageText()).toContain("contact@tremolonotes.com");
	});

	it("makes no request -- the page is static copy", () => {
		backend.verify();
	});
});
