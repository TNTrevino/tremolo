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
import { HomePageComponent } from "./home-page.component";

/**
 * Port of frontend-react/src/pages/HomePage.tsx, which had no test.
 *
 * The page is static, so what is worth pinning is the copy and the two
 * links out of it -- the things a restyle can silently drop. The parity
 * suite only asserts that `/home` resolves (navigation.spec.ts says nothing
 * about content), so if these headings regress nothing else notices until
 * somebody eyeballs a screenshot.
 */
describe("HomePageComponent", () => {
	let fixture: ComponentFixture<HomePageComponent>;
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
		fixture = TestBed.createComponent(HomePageComponent);
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

	/**
	 * Collapses internal whitespace too, not just leading/trailing -- the
	 * three feature cards became link labels in #262, and an anchor that
	 * wraps a heading and a paragraph carries whatever indentation sits
	 * between them in the template. That is exactly what accessible-name
	 * computation does with a multi-element label, so this is the more
	 * honest read of "the link's text", not just a convenience.
	 */
	function normalizedText(node: Element): string {
		return (node.textContent ?? "").replace(/\s+/g, " ").trim();
	}

	it("renders the hero headline and its supporting copy", () => {
		expect(el().querySelector("h1")?.textContent?.trim()).toBe(
			"Master music sight reading",
		);
		expect(el().textContent).toContain(
			"Practice reading notes, key signatures, intervals, scales, and chords",
		);
	});

	it("renders the three section headings in order", () => {
		expect(textOf("h2")).toEqual([
			"How It Works",
			"Built For Everyone",
			"Ready to Improve Your Sight Reading?",
		]);
	});

	it("renders the feature cards and the audience cards", () => {
		expect(textOf("[appCardTitle]")).toEqual([
			"Note Recognition Game",
			"Sheet-Music Generator",
			"Track Progress",
			"Music Teachers",
			"Students",
			"Musicians",
		]);
	});

	/**
	 * #262: the generator card's body was reworded away from a rhythm-game
	 * claim (no rhythm game exists), and "print-ready" was deliberately left
	 * out since there is no print feature either. Pinned on its own,
	 * separate from the link-label assertion below, so it survives even if
	 * the cards stop being link wrappers later.
	 */
	it("rewords the sheet-music generator card away from any rhythm-game or print claim", () => {
		expect(el().textContent).toContain(
			"Pick a scale, an octave and a 16th- or 8th-note rhythm pattern, and get a fresh line of notation to read. Every generation is different, so there is nothing to memorize.",
		);
		expect(el().textContent).not.toContain("print-ready");
	});

	it("numbers the three How It Works steps", () => {
		const steps = [...el().querySelectorAll(".rounded-full")].map((node) =>
			node.textContent?.trim(),
		);
		expect(steps).toEqual(["1", "2", "3"]);
		// The card titles are `<h3>` too: three before this section, three after.
		expect(textOf("h3").slice(3, 6)).toEqual([
			"Choose Your Exercise",
			"Practice & Learn",
			"Track Improvement",
		]);
	});

	/**
	 * #262: the three feature cards became whole-card links to the game
	 * (or dashboard) they represent, the smallest change that kept the
	 * cards' existing `group`/`hover:` treatment intact -- the `.group`
	 * class stays on the inner `appCard` div, which is still what the
	 * pointer is over when the wrapping `<a>` is hovered.
	 */
	it("links every anchor on the page to its target, in DOM order", () => {
		const links = [...el().querySelectorAll("a")].map((a) => ({
			href: a.getAttribute("href"),
			text: normalizedText(a),
		}));
		expect(links).toEqual([
			{ href: "/note-game", text: "Start practicing" },
			{
				href: "/note-game",
				text: "Note Recognition Game Interactive games that help you identify notes quickly and accurately. Track your speed and accuracy in real-time.",
			},
			{
				href: "/sheet-music",
				text: "Sheet-Music Generator Pick a scale, an octave and a 16th- or 8th-note rhythm pattern, and get a fresh line of notation to read. Every generation is different, so there is nothing to memorize.",
			},
			{
				href: "/dashboard",
				text: "Track Progress Every finished game is saved. Your dashboard charts accuracy and notes-per-minute over time, so improvement is something you can point at.",
			},
			{ href: "/pricing", text: "Free for pilot teachers this year" },
			{ href: "/note-game", text: "Start Note Game" },
			{ href: "/sheet-music", text: "Generate Sheet Music" },
		]);
	});

	/**
	 * DESIGN.md rule 5: the hero is a headline on faint engraved staff lines.
	 * Five lines, and decorative -- their container is `aria-hidden`, so the
	 * a11y tree sees a heading, not a drawing.
	 */
	it("draws five decorative staff lines behind the hero", () => {
		const staff = el().querySelector('[aria-hidden="true"].absolute');
		expect(staff?.querySelectorAll("div")).toHaveLength(5);
	});

	/**
	 * `<ng-icon>` puts `role="img"` on its host, so an icon without
	 * `aria-hidden` becomes a named node and changes what
	 * `getByRole("link", { name })` matches in the parity suite. Every icon
	 * here sits next to its own label.
	 */
	it("hides every icon from the accessibility tree", () => {
		const icons = [...el().querySelectorAll("ng-icon")];
		expect(icons.length).toBeGreaterThan(0);
		expect(
			icons.filter((icon) => icon.getAttribute("aria-hidden") !== "true"),
		).toEqual([]);
	});
});
