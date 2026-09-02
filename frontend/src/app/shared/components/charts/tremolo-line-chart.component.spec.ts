import { ComponentFixture, TestBed } from "@angular/core/testing";

import {
	TremoloLineChartComponent,
	type TremoloChartPoint,
	type TremoloSeries,
} from "./tremolo-line-chart.component";

const POINTS: TremoloChartPoint[] = [
	{ time: "2026-08-01", npm: 30, accuracy: 80 },
	{ time: "2026-08-02", npm: 55, accuracy: 90 },
	{ time: "2026-08-03", npm: 41, accuracy: 85 },
];

const SERIES: TremoloSeries[] = [
	{ key: "npm", name: "Notes Per Minute", color: "rgb(1, 2, 3)" },
	{ key: "accuracy", name: "Accuracy", color: "rgb(4, 5, 6)" },
];

/**
 * The recharts replacement, driven the way its call sites drive it.
 *
 * What is asserted is what a reader of the chart can tell apart -- a line
 * present or absent, a personal-best ring, a reference label, a legend that
 * dims -- not pixel coordinates, which are the one thing a screenshot diff
 * is better at.
 */
describe("TremoloLineChartComponent", () => {
	let fixture: ComponentFixture<TremoloLineChartComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({});
	});

	async function render(inputs: Record<string, unknown> = {}): Promise<void> {
		fixture = TestBed.createComponent(TremoloLineChartComponent);
		fixture.componentRef.setInput("xKey", "time");
		fixture.componentRef.setInput("data", POINTS);
		fixture.componentRef.setInput("series", SERIES);
		for (const [key, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(key, value);
		}
		await fixture.whenStable();
	}

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function lines(): SVGPathElement[] {
		return [...el().querySelectorAll<SVGPathElement>("path.tremolo-line")];
	}

	function legendButtons(): HTMLButtonElement[] {
		return [...el().querySelectorAll<HTMLButtonElement>("ul button")];
	}

	it("draws one curve per series, in the series' own colour", async () => {
		await render();

		expect(lines()).toHaveLength(2);
		expect(lines().map((p) => p.getAttribute("stroke"))).toEqual([
			"rgb(1, 2, 3)",
			"rgb(4, 5, 6)",
		]);
		// A real path, not an empty `d` -- a broken scale renders `d=""`.
		expect(lines()[0]?.getAttribute("d")).toMatch(/^M[\d.]+,[\d.]+C/);
	});

	it("draws a resting dot on every point of every visible series", async () => {
		await render();

		expect(el().querySelectorAll('circle[r="3"]')).toHaveLength(
			POINTS.length * SERIES.length,
		);
	});

	it("starts a series hidden when the caller says so, and the legend brings it back", async () => {
		await render({ initialHiddenSeries: ["accuracy"] });

		expect(lines()).toHaveLength(1);
		// The legend still lists it -- that is how the user finds it again.
		expect(legendButtons().map((b) => b.textContent?.trim())).toEqual([
			"Notes Per Minute",
			"Accuracy",
		]);
		expect(legendButtons()[1]?.getAttribute("aria-pressed")).toBe("false");

		legendButtons()[1]?.click();
		await fixture.whenStable();

		expect(lines()).toHaveLength(2);
		expect(legendButtons()[1]?.getAttribute("aria-pressed")).toBe("true");
	});

	it("hides a visible series when its legend entry is clicked", async () => {
		await render();

		legendButtons()[0]?.click();
		await fixture.whenStable();

		expect(lines()).toHaveLength(1);
		expect(lines()[0]?.getAttribute("stroke")).toBe("rgb(4, 5, 6)");
	});

	/**
	 * The ring is the one mark no Angular chart library offered, and it is
	 * why the chart is drawn here rather than configured (see the component's
	 * header). Its absence would be silent, so it is pinned.
	 */
	it("rings the maximum point of a personal-best series", async () => {
		await render({
			series: [{ ...SERIES[0], showPB: true } as TremoloSeries],
		});

		const ring = el().querySelector('circle[r="6"]');
		expect(ring).not.toBeNull();
		expect(ring?.getAttribute("stroke")).toBe("rgb(1, 2, 3)");

		// It sits on the highest value (55), which is the highest point on
		// screen, i.e. the smallest y of the three dots.
		const dotYs = [...el().querySelectorAll('circle[r="3"]')].map((c) =>
			Number(c.getAttribute("cy")),
		);
		expect(Number(ring?.getAttribute("cy"))).toBeLessThanOrEqual(
			Math.min(...dotYs),
		);
	});

	it("draws a dashed reference line with its label", async () => {
		await render({ referenceLines: [{ value: 42, label: "avg 42.0" }] });

		const dashed = [...el().querySelectorAll("line")].filter(
			(l) => l.getAttribute("stroke-dasharray") === "4 4",
		);
		expect(dashed).toHaveLength(1);
		expect(el().textContent).toContain("avg 42.0");
	});

	it("omits the legend when the caller turns it off", async () => {
		await render({ showLegend: false });

		expect(el().querySelector("ul")).toBeNull();
		expect(lines()).toHaveLength(2);
	});

	it("honours a fixed y domain instead of fitting the data", async () => {
		await render({ yDomain: [0, 100] });

		const yLabels = [...el().querySelectorAll("text")]
			.filter((t) => t.getAttribute("text-anchor") === "end")
			.map((t) => t.textContent?.trim());
		// The data tops out at 55; the fixed domain must still run 0..100.
		expect(yLabels).toEqual(["0", "20", "40", "60", "80", "100"]);
	});

	it("renders an empty chart rather than throwing when there is no data", async () => {
		await render({ data: [] });

		expect(lines().every((p) => p.getAttribute("d") === "")).toBe(true);
		expect(el().querySelectorAll('circle[r="3"]')).toHaveLength(0);
	});

	it("labels the svg for a screen reader", async () => {
		await render({ ariaLabel: "Performance over time" });

		const svg = el().querySelector("svg");
		expect(svg?.getAttribute("role")).toBe("img");
		expect(svg?.getAttribute("aria-label")).toBe("Performance over time");
	});

	it("snaps a crosshair and a tooltip to the nearest point on hover", async () => {
		await render();
		const container = el().querySelector("div") as HTMLElement;
		// jsdom gives every element a zero-sized box, so a pointer at x=0 is
		// the leftmost point -- which is all this needs: that hovering
		// produces a crosshair, a header and one row per visible series.
		container.dispatchEvent(
			new MouseEvent("mousemove", { clientX: 0, clientY: 0 }),
		);
		await fixture.whenStable();

		const crosshair = [...el().querySelectorAll("line")].filter(
			(l) => l.getAttribute("stroke-dasharray") === "3 3",
		);
		expect(crosshair).toHaveLength(1);
		expect(el().textContent).toContain("2026-08-01");
		expect(el().textContent).toContain("Notes Per Minute");
		expect(el().querySelectorAll('circle[r="5"]')).toHaveLength(2);

		container.dispatchEvent(new MouseEvent("mouseleave"));
		await fixture.whenStable();
		expect(
			[...el().querySelectorAll("line")].filter(
				(l) => l.getAttribute("stroke-dasharray") === "3 3",
			),
		).toHaveLength(0);
	});

	it("formats tooltip values with the series' own formatter", async () => {
		await render({
			series: [
				{ ...SERIES[0], format: (v: number) => `${v.toFixed(1)} npm` },
			] as TremoloSeries[],
		});
		(el().querySelector("div") as HTMLElement).dispatchEvent(
			new MouseEvent("mousemove", { clientX: 0, clientY: 0 }),
		);
		await fixture.whenStable();

		expect(el().textContent).toContain("30.0 npm");
	});
});
