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

/** The `x` a month label sits at, given its column. Mirrors the component. */
function columnX(weekIndex: number): number {
	const LEFT_LABEL_WIDTH = 32;
	const CELL_SIZE = 12;
	const CELL_GAP = 3;
	return LEFT_LABEL_WIDTH + weekIndex * (CELL_SIZE + CELL_GAP);
}

describe("ActivityHeatmapComponent", () => {
	let fixture: ComponentFixture<ActivityHeatmapComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	/**
	 * Pins the clock so the grid's shape is fixed. Only `Date` is faked --
	 * faking the timers too would stall `whenStable()`.
	 */
	function freezeAt(year: number, month: number, day: number): void {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(year, month, day));
	}

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

	/**
	 * The month labels, left to right. Day-of-week labels are the other
	 * `<text>`s in the SVG and are the only ones drawn at `x = 0`.
	 */
	function monthLabels(): { label: string; x: number }[] {
		return [...el().querySelectorAll("text")]
			.map((t) => ({
				label: t.textContent?.trim() ?? "",
				x: Number(t.getAttribute("x")),
			}))
			.filter((t) => t.x !== 0);
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
		// The grid spans a year, so every month in it is announced. Only the
		// two partial months at the ends can go unlabelled, which is why this
		// is 12 or 13 rather than exactly one per calendar month.
		expect(monthLabels().length).toBeGreaterThanOrEqual(12);
	});

	it("labels a month that starts mid-week over the column it begins in", async () => {
		// Thu 15 Jan 2026 opens the grid on Sun 12 Jan 2025. 1 Feb 2025 is a
		// Saturday, the last day of column 2, so February is announced over
		// column 3 -- the first column that is actually February.
		freezeAt(2026, 0, 15);
		await render();

		expect(monthLabels().map((m) => m.label)).toEqual([
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec",
			"Jan",
		]);
		expect(monthLabels()[1]).toEqual({ label: "Feb", x: columnX(3) });
		// March 2025 starts on a Saturday too, and April on a Tuesday.
		expect(monthLabels()[2]).toEqual({ label: "Mar", x: columnX(7) });
		expect(monthLabels()[3]).toEqual({ label: "Apr", x: columnX(12) });
	});

	it("never stacks two month labels in one column", async () => {
		// Fri 4 Sep 2026 opens the grid on Sun 31 Aug 2025, and September
		// starts the very next day, a Monday: both months want column 0.
		// September owns six of that column's seven days, so it takes it.
		freezeAt(2026, 8, 4);
		await render();

		const xs = monthLabels().map((m) => m.x);
		expect(new Set(xs).size).toBe(xs.length);
		expect(xs).toEqual([...xs].sort((a, b) => a - b));
		expect(monthLabels()[0]).toEqual({ label: "Sep", x: columnX(0) });
		expect(monthLabels().map((m) => m.label)).toEqual([
			"Sep",
			"Oct",
			"Nov",
			"Dec",
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
		]);
	});

	it("keeps every month label inside the drawn grid", async () => {
		// Sep 2026 first appears on Tue 1 Sep, in the final partial column,
		// so its label would land one column past the right edge. Dropped
		// rather than drawn where the viewBox clips it.
		freezeAt(2026, 8, 4);
		await render();

		const svg = el().querySelector("svg");
		const width = Number(svg?.getAttribute("viewBox")?.split(" ")[2]);
		for (const month of monthLabels()) expect(month.x).toBeLessThan(width);
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
