import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import type { ComponentFixture } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideIcons } from "@ng-icons/core";

import { TREMOLO_ICONS } from "../../core/icons";
import { AboutPageComponent } from "./about-page.component";

/**
 * Port of frontend-react/src/pages/AboutPage.tsx, which had no test.
 *
 * React wrote the five highlight rows out longhand and this port loops over
 * data, so the rows are the thing most worth asserting: a mis-ordered or
 * dropped entry would otherwise only show up in a screenshot diff.
 */
describe("AboutPageComponent", () => {
	let fixture: ComponentFixture<AboutPageComponent>;
	let backend: HttpTestingController;

	beforeEach(async () => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				provideIcons(TREMOLO_ICONS),
			],
		});
		backend = TestBed.inject(HttpTestingController);
		fixture = TestBed.createComponent(AboutPageComponent);
		await fixture.whenStable();
	});

	afterEach(() => {
		backend.verify();
		vi.restoreAllMocks();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function textOf(selector: string): string[] {
		return [...el().querySelectorAll(selector)].map(
			(node) => node.textContent?.trim() ?? "",
		);
	}

	it("renders the page heading and the two audience sections", () => {
		expect(el().querySelector("h1")?.textContent?.trim()).toBe("About Tremolo");
		expect(textOf("h2")).toEqual([
			"For Music Educators",
			"For Developing Musicians",
		]);
	});

	it("renders the mission and vision cards", () => {
		expect(textOf("[appCardTitle]")).toEqual(["Our Mission", "The Vision"]);
		expect(el().textContent).toContain(
			"students were memorizing sheet music instead of actually learning to read it",
		);
		expect(el().textContent).toContain(
			"Real skills. Real progress. Real results.",
		);
	});

	it("renders the five highlight rows in order", () => {
		expect(textOf("h3").filter((text) => text.length > 0)).toEqual([
			"Our Mission",
			"Real Reading, Not Memorization",
			"UIL-Focused Practice",
			"Customizable Learning Paths",
			"Advanced Skill Development",
			"Practice What You Need",
			"The Vision",
		]);
	});

	/**
	 * The tile and icon colours are complete class strings in the component,
	 * not names a template interpolates: Tailwind only emits what it can find
	 * as a literal, so `bg-brass/10` assembled at runtime would never exist in
	 * the stylesheet. Asserting the rendered class keeps that honest.
	 */
	it("tints the brass rows brass and the rest primary", () => {
		const tiles = [...el().querySelectorAll("ng-icon")].map((icon) =>
			icon.getAttribute("class"),
		);
		expect(tiles).toEqual([
			"text-primary",
			"text-brass",
			"text-primary",
			"text-primary",
			"text-brass",
		]);
		expect(el().querySelectorAll(".bg-brass\\/10")).toHaveLength(2);
		expect(el().querySelectorAll(".bg-primary\\/10")).toHaveLength(3);
	});

	/** Same rule as every other page: a decorative icon stays out of the tree. */
	it("hides every icon from the accessibility tree", () => {
		const icons = [...el().querySelectorAll("ng-icon")];
		expect(icons.length).toBeGreaterThan(0);
		expect(
			icons.filter((icon) => icon.getAttribute("aria-hidden") !== "true"),
		).toEqual([]);
	});
});
