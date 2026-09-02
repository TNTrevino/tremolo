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
import { NotFoundPageComponent } from "./not-found-page.component";

/**
 * #263: the router's `**` wildcard lands here for any URL that matches
 * nothing else in app.routes.ts -- see app.routes.spec.ts for the
 * route-table assertions (last entry, exactly one `**`, a production
 * visitor bounced off /dev/kit lands here too).
 */
describe("NotFoundPageComponent", () => {
	let fixture: ComponentFixture<NotFoundPageComponent>;
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
		fixture = TestBed.createComponent(NotFoundPageComponent);
		await fixture.whenStable();
	});

	afterEach(() => {
		backend.verify();
		vi.restoreAllMocks();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	it("renders the heading and the explanatory copy", () => {
		expect(el().querySelector("h1")?.textContent?.trim()).toBe(
			"This page is off the staff",
		);
		expect(el().textContent).toContain(
			"We could not find that page. The address may have a typo, or the link that brought you here may be out of date.",
		);
	});

	it("links to the note game and the home page", () => {
		const links = [...el().querySelectorAll("a")].map((a) => ({
			href: a.getAttribute("href"),
			text: a.textContent?.trim(),
		}));
		expect(links).toEqual([
			{ href: "/note-game", text: "Start practicing" },
			{ href: "/home", text: "Go to the home page" },
		]);
	});

	it("hides every icon from the accessibility tree", () => {
		const icons = [...el().querySelectorAll("ng-icon")];
		expect(icons.length).toBeGreaterThan(0);
		expect(
			icons.filter((icon) => icon.getAttribute("aria-hidden") !== "true"),
		).toEqual([]);
	});
});
