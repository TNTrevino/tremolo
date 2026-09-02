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
import { PricingPageComponent } from "./pricing-page.component";

/**
 * #264: the pricing page, reachable signed out at /pricing.
 *
 * Same shape as HomePageComponent's spec -- static copy, no request, so
 * `backend.verify()` in `afterEach` doubles as proof the page holds no
 * state or HTTP call of its own. The sharpest regression this page can
 * take is a price sneaking into the copy before there is a real one to
 * quote, so "never states a price" is asserted directly rather than left
 * to a copy review.
 */
describe("PricingPageComponent", () => {
	let fixture: ComponentFixture<PricingPageComponent>;
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
		fixture = TestBed.createComponent(PricingPageComponent);
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

	it("renders signed out, with the hero headline and its supporting copy", () => {
		expect(el().querySelector("h1")?.textContent?.trim()).toBe(
			"Free for pilot teachers",
		);
		expect(el().textContent).toContain(
			"Tremolo is free for the whole 2026–27 school year for every teacher in the pilot.",
		);
	});

	it("renders the four section headings in order", () => {
		expect(textOf("h2")).toEqual([
			"What's included",
			"What being a pilot teacher means",
			"After the pilot",
			"Want in for 2026–27?",
		]);
	});

	it("renders the four included-card titles in order", () => {
		expect(textOf("[appCardTitle]")).toEqual([
			"All five games",
			"The sheet-music generator",
			"Classes and assignments",
			"Progress you can see",
		]);
	});

	/** The same invite CTA appears in the hero and again at the bottom. */
	it("points both invite CTAs at the same mailto invite address", () => {
		const inviteLinks = [...el().querySelectorAll("a")].filter((a) =>
			a.textContent?.trim().includes("Ask for an invite code"),
		);

		expect(inviteLinks).toHaveLength(2);
		for (const link of inviteLinks) {
			expect(link.getAttribute("href")).toMatch(
				/^mailto:contact@tremolonotes\.com/,
			);
		}
	});

	it("links the secondary CTAs to signup and the note game", () => {
		const links = [...el().querySelectorAll("a")].map((a) => ({
			href: a.getAttribute("href"),
			text: a.textContent?.trim(),
		}));

		expect(links).toContainEqual({
			href: "/signup",
			text: "Students: create a free account",
		});
		expect(links).toContainEqual({
			href: "/note-game",
			text: "Try a game first",
		});
	});

	/**
	 * There is no priced tier yet -- the whole point of the pilot. A price
	 * or a per-student rate showing up here would be a promise nobody
	 * signed off on.
	 */
	it("never states a price", () => {
		expect(el().textContent).not.toMatch(/\$\d/);
		expect(el().textContent).not.toContain("per student");
	});

	/**
	 * `<ng-icon>` puts `role="img"` on its host, so an icon without
	 * `aria-hidden` becomes a named node in the accessibility tree.
	 */
	it("hides every icon from the accessibility tree", () => {
		const icons = [...el().querySelectorAll("ng-icon")];
		expect(icons.length).toBeGreaterThan(0);
		expect(
			icons.filter((icon) => icon.getAttribute("aria-hidden") !== "true"),
		).toEqual([]);
	});
});
