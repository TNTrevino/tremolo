import { type ComponentFixture, TestBed } from "@angular/core/testing";

import type { NoteStreamStats } from "../../models/note-stream.models";
import { StreamResultsComponent } from "./stream-results.component";

function stats(overrides: Partial<NoteStreamStats> = {}): NoteStreamStats {
	return {
		score: 4200,
		maxStreak: 18,
		counts: { perfect: 12, great: 6, good: 3, miss: 2 },
		totalNotes: 23,
		accuracy: 91.3,
		...overrides,
	};
}

/**
 * The screen is mostly dumb, but two rules are not: the miss count wears the
 * feedback red only when there is a miss, and both buttons must reach the page
 * that owns the session.
 */
describe("StreamResultsComponent", () => {
	let fixture: ComponentFixture<StreamResultsComponent>;

	async function render(value = stats()): Promise<void> {
		fixture = TestBed.createComponent(StreamResultsComponent);
		fixture.componentRef.setInput("stats", value);
		fixture.detectChanges();
		await fixture.whenStable();
	}

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function button(label: string): HTMLButtonElement {
		const found = [...el().querySelectorAll("button")].find(
			(candidate) => candidate.textContent?.trim() === label,
		);
		if (!found) throw new Error(`no button labelled "${label}"`);
		return found;
	}

	afterEach(() => {
		TestBed.resetTestingModule();
	});

	it("leads with the score in brass and rounds the accuracy", async () => {
		await render();

		const score = el().querySelector(".text-brass");
		expect(score?.textContent?.trim()).toBe("4200");
		expect(el().textContent).toContain("91%");
		expect(el().textContent).toContain("18");
		expect(el().textContent).toContain("23 notes came through");
	});

	it("lists the four judgment counts best to worst", async () => {
		await render();

		const labels = [...el().querySelectorAll("p > span:last-child")]
			.map((span) => span.textContent?.trim())
			.filter((text) => text && /^(Perfect|Great|Good|Miss)$/.test(text));

		expect(labels).toEqual(["Perfect", "Great", "Good", "Miss"]);
	});

	it("reddens the miss count only when there is a miss", async () => {
		await render();
		expect(el().querySelector(".text-destructive")?.textContent?.trim()).toBe(
			"2",
		);

		await render(
			stats({ counts: { perfect: 12, great: 6, good: 3, miss: 0 } }),
		);
		expect(el().querySelector(".text-destructive")).toBeNull();
	});

	it("emits the two ways out of the results screen", async () => {
		await render();
		const component = fixture.componentInstance;

		const seen: string[] = [];
		component.playAgain.subscribe(() => seen.push("playAgain"));
		component.changeSettings.subscribe(() => seen.push("changeSettings"));

		button("Play again").click();
		button("Change settings").click();

		expect(seen).toEqual(["playAgain", "changeSettings"]);
	});
});
