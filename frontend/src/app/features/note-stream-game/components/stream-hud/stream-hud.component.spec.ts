import { type ComponentFixture, TestBed } from "@angular/core/testing";

import type {
	NoteJudged,
	StreamJudgment,
	StreamNote,
} from "../../models/note-stream.models";
import { StreamHudComponent } from "./stream-hud.component";

const NOTE: StreamNote = {
	id: 7,
	name: "F#",
	diatonicIndex: 31,
	accidental: "sharp",
	beat: 3,
};

function judged(judgment: StreamJudgment, note: StreamNote = NOTE): NoteJudged {
	return { note, judgment, deltaMs: 12 };
}

/**
 * Two rules are pinned here rather than left to the eye. The blue streak is
 * the page's one non-token colour and must appear only at the multiplier cap;
 * and the judgment popup must be replaced per note id, because that is what
 * restarts its animation.
 */
describe("StreamHudComponent", () => {
	let fixture: ComponentFixture<StreamHudComponent>;

	async function render(
		values: {
			score?: number;
			streak?: number;
			multiplier?: number;
			lastJudged?: NoteJudged | null;
		} = {},
	): Promise<void> {
		fixture = TestBed.createComponent(StreamHudComponent);
		fixture.componentRef.setInput("score", values.score ?? 0);
		fixture.componentRef.setInput("streak", values.streak ?? 0);
		fixture.componentRef.setInput("multiplier", values.multiplier ?? 1);
		fixture.componentRef.setInput("lastJudged", values.lastJudged ?? null);
		fixture.detectChanges();
		await fixture.whenStable();
	}

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	afterEach(() => {
		TestBed.resetTestingModule();
	});

	it("puts the score figure in brass with tabular figures", async () => {
		await render({ score: 1250 });

		const figure = el().querySelector(".text-brass");
		expect(figure?.textContent?.trim()).toBe("1250");
		expect(figure?.getAttribute("class")).toContain("tabular-nums");
	});

	it("keeps the flame ink below the multiplier cap", async () => {
		await render({ streak: 25, multiplier: 3 });

		expect(el().querySelector(".stream-blue")).toBeNull();
		expect(el().textContent).toContain("×3");
	});

	it("turns the streak blue at the multiplier cap", async () => {
		await render({ streak: 40, multiplier: 4 });

		// Both the flame and the badge switch; nothing else in the app uses
		// this class.
		expect(el().querySelectorAll(".stream-blue")).toHaveLength(2);
		expect(el().querySelector(".stream-flame")).toBeTruthy();
	});

	it("shows nothing in the popup before the first judgment", async () => {
		await render();

		expect(el().querySelector(".stream-popup")).toBeNull();
		expect(el().querySelector("[aria-live]")?.textContent?.trim()).toBe("");
	});

	it("colours the popup by judgment and mirrors it to a live region", async () => {
		await render({ lastJudged: judged("perfect") });
		let popup = el().querySelector(".stream-popup");
		expect(popup?.textContent?.trim()).toBe("Perfect!");
		// Perfect is the score the player chases, so it gets the brass.
		expect(popup?.getAttribute("class")).toContain("text-brass");
		expect(el().querySelector("[aria-live]")?.textContent?.trim()).toBe(
			"Perfect! F#",
		);

		fixture.componentRef.setInput("lastJudged", judged("miss"));
		fixture.detectChanges();
		popup = el().querySelector(".stream-popup");
		expect(popup?.textContent?.trim()).toBe("Miss");
		expect(popup?.getAttribute("class")).toContain("text-destructive");

		fixture.componentRef.setInput("lastJudged", judged("good"));
		fixture.detectChanges();
		expect(
			el().querySelector(".stream-popup")?.getAttribute("class"),
		).toContain("text-correct");
	});

	it("replaces the popup element per note so the pop retriggers", async () => {
		await render({ lastJudged: judged("great") });
		const first = el().querySelector(".stream-popup");

		fixture.componentRef.setInput(
			"lastJudged",
			judged("great", { ...NOTE, id: 8 }),
		);
		fixture.detectChanges();

		expect(el().querySelector(".stream-popup")).not.toBe(first);
	});
});
