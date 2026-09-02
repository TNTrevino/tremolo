import { ComponentFixture, TestBed } from "@angular/core/testing";

import type { DailyActivity } from "../../models/game.models";
import { ActivityHeatmapComponent } from "./activity-heatmap.component";

/** "YYYY-MM-DD" for `daysAgo` days before today, in local time. */
function dateOffset(daysAgo: number): string {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() - daysAgo);
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

describe("ActivityHeatmapComponent", () => {
	let fixture: ComponentFixture<ActivityHeatmapComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({});
	});

	async function render(data: DailyActivity[] = []): Promise<void> {
		fixture = TestBed.createComponent(ActivityHeatmapComponent);
		fixture.componentRef.setInput("data", data);
		await fixture.whenStable();
	}

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function cells(): SVGRectElement[] {
		return [...el().querySelectorAll<SVGRectElement>("rect[data-date]")];
	}

	it("draws a year of days ending on today", async () => {
		await render();

		// 52 weeks plus however far into the current week today is.
		const expected = 52 * 7 + new Date().getDay() + 1;
		expect(cells()).toHaveLength(expected);
		expect(cells()[cells().length - 1]?.getAttribute("data-date")).toBe(
			dateOffset(0),
		);
	});

	it("labels itself for a screen reader", async () => {
		await render();

		const svg = el().querySelector("svg");
		expect(svg?.getAttribute("role")).toBe("img");
		expect(svg?.getAttribute("aria-label")).toBe(
			"Activity heatmap showing games played per day",
		);
	});

	it("colours a day with games differently from an empty one", async () => {
		await render([{ date: dateOffset(1), gameCount: 9 }]);

		const played = cells().find(
			(c) => c.getAttribute("data-date") === dateOffset(1),
		);
		const empty = cells().find(
			(c) => c.getAttribute("data-date") === dateOffset(2),
		);
		expect(empty?.getAttribute("fill")).toBe("hsl(var(--muted) / 0.5)");
		// The *only* non-zero day is its own 25th percentile, so it lands on
		// level 1, not level 4. That reads oddly and is deliberately kept:
		// the ramp is relative to the user's own year, so one game does not
		// paint itself as a personal record.
		expect(played?.getAttribute("fill")).toBe("hsl(var(--primary) / 0.25)");
	});

	it("ramps busy days up the colour scale, thresholds and all", async () => {
		await render([
			{ date: dateOffset(1), gameCount: 1 },
			{ date: dateOffset(2), gameCount: 3 },
			{ date: dateOffset(3), gameCount: 6 },
			{ date: dateOffset(4), gameCount: 20 },
		]);

		const fills = [1, 2, 3, 4].map(
			(n) =>
				cells()
					.find((c) => c.getAttribute("data-date") === dateOffset(n))
					?.getAttribute("fill") ?? "",
		);
		// React's `computeQuartiles` indexes the sorted array rather than
		// interpolating, and `getColorLevel` compares with `<=`, so
		// [1, 3, 6, 20] lands on levels 1, 1, 2, 3 -- not one per level.
		// Ported exactly; a "fix" here would change every existing heatmap.
		expect(fills).toEqual([
			"hsl(var(--primary) / 0.25)",
			"hsl(var(--primary) / 0.25)",
			"hsl(var(--primary) / 0.45)",
			"hsl(var(--primary) / 0.7)",
		]);
	});

	it("shows Mon, Wed and Fri down the left and month names along the top", async () => {
		await render();

		const texts = [...el().querySelectorAll("text")].map((t) =>
			t.textContent?.trim(),
		);
		expect(texts).toEqual(expect.arrayContaining(["Mon", "Wed", "Fri"]));
		// React emits a month label only when the month turns on a Sunday or
		// Monday, so roughly half the months are unlabelled. Ported as is;
		// the count is asserted loosely because which months qualify depends
		// on what day of the week today is.
		const months = texts.filter((t) => t && !["Mon", "Wed", "Fri"].includes(t));
		expect(months.length).toBeGreaterThanOrEqual(4);
		expect(months.length).toBeLessThanOrEqual(13);
	});

	it("carries a Less/More ramp with one swatch per level", async () => {
		await render();

		expect(el().textContent).toContain("Less");
		expect(el().textContent).toContain("More");
		expect(el().querySelectorAll("span.rounded-sm")).toHaveLength(5);
	});

	it("describes the hovered day, and clears when the pointer leaves", async () => {
		await render([{ date: dateOffset(1), gameCount: 1 }]);

		const svg = el().querySelector("svg") as SVGSVGElement;
		const cell = cells().find(
			(c) => c.getAttribute("data-date") === dateOffset(1),
		) as SVGRectElement;

		const move = new MouseEvent("mousemove", {
			clientX: 5,
			clientY: 5,
			bubbles: true,
		});
		cell.dispatchEvent(move);
		await fixture.whenStable();

		// Singular for one game -- React's `game${count === 1 ? "" : "s"}`.
		// The two halves are separate spans separated by a margin, so there is
		// no space between them in `textContent`, exactly as in React.
		expect(el().textContent).toContain("1 gameon ");
		expect(el().textContent).not.toContain("1 games");

		svg.dispatchEvent(new MouseEvent("mouseleave"));
		await fixture.whenStable();
		expect(el().textContent).not.toContain("1 gameon ");
	});

	it("says 'No games' for an empty day", async () => {
		await render();

		const cell = cells()[10] as SVGRectElement;
		cell.dispatchEvent(
			new MouseEvent("mousemove", { clientX: 5, clientY: 5, bubbles: true }),
		);
		await fixture.whenStable();

		expect(el().textContent).toContain("No games");
	});
});
