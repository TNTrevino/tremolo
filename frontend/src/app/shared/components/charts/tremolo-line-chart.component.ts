import {
	ChangeDetectionStrategy,
	Component,
	computed,
	ElementRef,
	inject,
	input,
	linkedSignal,
	signal,
	viewChild,
	afterNextRender,
	DestroyRef,
} from "@angular/core";
import { curveMonotoneX, line as d3Line } from "d3-shape";

import { formatTick, labelStride, niceScale } from "./chart-scale";

/**
 * Port of frontend-react/src/shared/components/charts/TremoloLineChart.tsx.
 *
 * The house-style line chart: small resting dots, a dashed crosshair and a
 * themed tooltip on hover, a soft horizontal-only grid, clean axes, a legend
 * you can click to hide a series, an optional dashed average line and an
 * optional personal-best ring on each series' maximum.
 *
 * **This is the recharts replacement.** The decision, the alternatives that
 * were measured and rejected, and the `npm view` output behind it are in
 * `.migration/phase-3-subfeature-6-handoff.md` §2. The short version: no
 * Angular chart library reproduces the personal-best ring or the
 * hide-on-legend-click, both are load-bearing here, and every candidate drags
 * in `@angular/cdk` (plus `@angular/animations` and a legacy
 * `platform-browser-dynamic` for one of them). So the marks are drawn
 * directly in SVG and the only dependency is `d3-shape` -- which is what
 * recharts drew `type="monotone"` with, so the curve is not an approximation
 * of the React line, it is the same algorithm.
 *
 * Three call sites, all with the same prop names React used:
 * the dashboard's performance chart, the class attempt drill-down
 * (`showLegend={false}`, `yDomain={[0, 100]}`) and the note game's results
 * chart.
 */

/**
 * A data point. Declared as an index-signature type rather than an interface
 * so that a caller's own `type PerformancePoint = { time: string; npm: number }`
 * is assignable without a cast -- TypeScript gives type aliases an implicit
 * index signature and interfaces none.
 */
export type TremoloChartPoint = Record<string, string | number>;

export interface TremoloSeries {
	/** Key in the data point object that holds this series' value. */
	key: string;
	/** Display name shown in the legend and the tooltip. */
	name: string;
	/** CSS color string (`hsl(var(--brass))`, a hex, anything CSS accepts). */
	color: string;
	/** Stroke width; defaults to 2.5. */
	strokeWidth?: number;
	/** Tooltip value formatter, e.g. `v => `${v.toFixed(1)}%``. */
	format?: (value: number) => string;
	/** Ring the maximum point of this series as a personal best. */
	showPB?: boolean;
}

export interface TremoloReferenceLine {
	/** Y value to draw the horizontal line at. */
	value: number;
	/** Short label rendered at the right edge of the line. */
	label?: string;
	/** CSS color; defaults to the muted foreground. */
	color?: string;
}

/** recharts' `margin` prop, carried over verbatim from the React component. */
const MARGIN = { top: 16, right: 24, bottom: 8, left: 0 } as const;

/** recharts' `<YAxis width={40}>`, and its default `<XAxis>` height. */
const Y_AXIS_WIDTH = 40;
const X_AXIS_HEIGHT = 30;

/** The legend row plus recharts' `wrapperStyle: { paddingTop: 12 }`. */
const LEGEND_HEIGHT = 32;

/**
 * Width used until the `ResizeObserver` reports a real one.
 *
 * `ResponsiveContainer` had the same chicken-and-egg problem and solved it
 * by rendering nothing on the first pass. Rendering at a plausible width
 * instead means the chart is never briefly blank, and it means a jsdom spec
 * -- where every element measures 0 and the observer stub never fires --
 * still gets a fully drawn chart to assert against.
 */
const FALLBACK_WIDTH = 640;

const MUTED = "hsl(var(--muted-foreground))";

interface RenderedSeries {
	key: string;
	name: string;
	color: string;
	strokeWidth: number;
	path: string;
	dots: readonly { key: string; cx: number; cy: number }[];
	pb: { cx: number; cy: number } | null;
	active: { cx: number; cy: number } | null;
}

interface AxisLabel {
	key: string;
	x: number;
	y: number;
	text: string;
}

interface GridLine {
	key: string;
	y: number;
}

interface RenderedReferenceLine {
	key: string;
	y: number;
	color: string;
	label: string | null;
}

interface TooltipRow {
	key: string;
	name: string;
	color: string;
	value: string;
}

interface LegendItem {
	key: string;
	name: string;
	color: string;
	hidden: boolean;
}

@Component({
	selector: "app-tremolo-line-chart",
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: "block w-full" },
	styles: `
		/*
		 * recharts drew each line in 600ms, ease-out. The pathLength="1"
		 * attribute normalises any path to a length of 1, so one dash of 1
		 * covers it exactly and the offset animates without measuring
		 * anything.
		 */
		@keyframes tremolo-line-draw {
			from {
				stroke-dashoffset: 1;
			}
			to {
				stroke-dashoffset: 0;
			}
		}

		.tremolo-line {
			stroke-dasharray: 1;
			animation: tremolo-line-draw 600ms ease-out;
		}

		@media (prefers-reduced-motion: reduce) {
			.tremolo-line {
				animation: none;
			}
		}
	`,
	templateUrl: "./tremolo-line-chart.component.html",
})
export class TremoloLineChartComponent {
	private readonly host = inject(ElementRef<HTMLElement>);

	readonly data = input<readonly TremoloChartPoint[]>([]);
	readonly series = input<readonly TremoloSeries[]>([]);
	readonly xKey = input.required<string>();
	readonly height = input(320);
	readonly xTickFormatter = input<((value: unknown) => string) | null>(null);
	readonly tooltipLabelFormatter = input<
		((value: unknown, point: TremoloChartPoint | undefined) => string) | null
	>(null);
	readonly referenceLines = input<readonly TremoloReferenceLine[]>([]);
	readonly showLegend = input(true);
	readonly initialHiddenSeries = input<readonly string[]>([]);
	/** Fixed Y domain, e.g. `[0, 100]` for a percentage. Otherwise auto. */
	readonly yDomain = input<readonly [number, number] | null>(null);
	readonly ariaLabel = input("Line chart");

	private readonly plotRef =
		viewChild<ElementRef<HTMLDivElement>>("plotContainer");

	/**
	 * Which series the user has clicked off in the legend.
	 *
	 * `linkedSignal` rather than a plain `signal` because the seed is an
	 * input, which is not readable at field-initialiser time. It re-seeds if
	 * the input's *identity* changes; all three call sites pass a module-level
	 * constant, so in practice it seeds once, exactly like React's lazy
	 * `useState` initialiser.
	 */
	private readonly hidden = linkedSignal<ReadonlySet<string>>(
		() => new Set(this.initialHiddenSeries()),
	);

	private readonly measuredWidth = signal(0);
	protected readonly activeIndex = signal<number | null>(null);
	private readonly pointer = signal<{ x: number; y: number } | null>(null);

	protected readonly width = computed(
		() => this.measuredWidth() || FALLBACK_WIDTH,
	);

	constructor() {
		// `ResizeObserver` rather than a window resize listener: the card the
		// chart sits in also changes width when the friends panel opens, which
		// fires no window event.
		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			const next = entry
				? entry.contentRect.width
				: this.host.nativeElement.clientWidth;
			this.measuredWidth.set(Math.round(next));
		});
		afterNextRender(() => {
			observer.observe(this.host.nativeElement);
			this.measuredWidth.set(
				Math.round(this.host.nativeElement.getBoundingClientRect().width),
			);
		});
		inject(DestroyRef).onDestroy(() => observer.disconnect());
	}

	protected readonly svgHeight = computed(() =>
		Math.max(0, this.height() - (this.showLegend() ? LEGEND_HEIGHT : 0)),
	);

	/** The plot box, in SVG user units. */
	private readonly plot = computed(() => {
		const left = MARGIN.left + Y_AXIS_WIDTH;
		const right = Math.max(left + 1, this.width() - MARGIN.right);
		const top = MARGIN.top;
		const bottom = Math.max(
			top + 1,
			this.svgHeight() - MARGIN.bottom - X_AXIS_HEIGHT,
		);
		return { left, right, top, bottom, w: right - left, h: bottom - top };
	});

	/** Series the legend has not switched off. */
	private readonly visibleSeries = computed(() =>
		this.series().filter((s) => !this.hidden().has(s.key)),
	);

	/**
	 * The Y domain and its ticks.
	 *
	 * Only *visible* series contribute, which is what makes the dashboard's
	 * default view read as a notes-per-minute chart: accuracy (0-100) and
	 * total questions start hidden, so the axis fits the NPM range instead of
	 * flattening it against a 0-100 scale. recharts' `hide` prop did the same.
	 */
	private readonly yScale = computed(() => {
		const fixed = this.yDomain();
		if (fixed) {
			const scale = niceScale(fixed[0], fixed[1]);
			// A caller-fixed domain is exact -- only the ticks are "niced".
			return {
				min: fixed[0],
				max: fixed[1],
				ticks: scale.ticks.filter((t) => t >= fixed[0] && t <= fixed[1]),
			};
		}

		let min = Number.POSITIVE_INFINITY;
		let max = Number.NEGATIVE_INFINITY;
		for (const point of this.data()) {
			for (const s of this.visibleSeries()) {
				const value = point[s.key];
				if (typeof value !== "number" || !Number.isFinite(value)) continue;
				if (value < min) min = value;
				if (value > max) max = value;
			}
		}
		for (const ref of this.referenceLines()) {
			if (ref.value < min) min = ref.value;
			if (ref.value > max) max = ref.value;
		}
		return niceScale(min, max);
	});

	private readonly xAt = computed(() => {
		const { left, w } = this.plot();
		const count = this.data().length;
		return (index: number): number =>
			count <= 1 ? left + w / 2 : left + (index / (count - 1)) * w;
	});

	private readonly yAt = computed(() => {
		const { top, h } = this.plot();
		const { min, max } = this.yScale();
		const span = max - min || 1;
		return (value: number): number => top + h * (1 - (value - min) / span);
	});

	protected readonly gridLines = computed<GridLine[]>(() =>
		this.yScale().ticks.map((t) => ({ key: `g-${t}`, y: this.yAt()(t) })),
	);

	protected readonly yLabels = computed<AxisLabel[]>(() =>
		this.yScale().ticks.map((t) => ({
			key: `y-${t}`,
			x: this.plot().left - 5,
			y: this.yAt()(t),
			text: formatTick(t),
		})),
	);

	protected readonly xLabels = computed<AxisLabel[]>(() => {
		const points = this.data();
		if (points.length === 0) return [];

		const format = this.xTickFormatter();
		const key = this.xKey();
		const texts = points.map((p) => {
			const raw = p[key];
			return format ? format(raw) : raw == null ? "" : String(raw);
		});
		const longest = texts.reduce((n, t) => Math.max(n, t.length), 0);
		const stride = labelStride(points.length, this.plot().w, longest);
		const y = this.plot().bottom + 16;

		const labels: AxisLabel[] = [];
		for (let i = 0; i < points.length; i += stride) {
			const text = texts[i] ?? "";
			if (!text) continue;
			labels.push({ key: `x-${i}`, x: this.xAt()(i), y, text });
		}
		return labels;
	});

	protected readonly refLines = computed<RenderedReferenceLine[]>(() =>
		this.referenceLines().map((ref, i) => ({
			key: `ref-${i}`,
			y: this.yAt()(ref.value),
			color: ref.color ?? MUTED,
			label: ref.label ?? null,
		})),
	);

	/** Left and right edges of the plot box, for the template's full-width marks. */
	protected readonly plotLeft = computed(() => this.plot().left);
	protected readonly plotRight = computed(() => this.plot().right);

	/**
	 * The dashed crosshair, or null when the pointer is away. Boxed rather
	 * than returned bare so that `@if (cursor(); as c)` cannot be fooled by a
	 * legitimate x of 0.
	 */
	protected readonly cursor = computed<{ x: number } | null>(() => {
		const index = this.activeIndex();
		return index == null ? null : { x: this.xAt()(index) };
	});

	protected readonly rendered = computed<RenderedSeries[]>(() => {
		const points = this.data();
		const xAt = this.xAt();
		const yAt = this.yAt();
		const active = this.activeIndex();

		const generator = d3Line<{ i: number; v: number | null }>()
			.defined((p) => p.v !== null)
			.x((p) => xAt(p.i))
			.y((p) => yAt(p.v ?? 0))
			.curve(curveMonotoneX);

		return this.visibleSeries().map((s) => {
			const values = points.map((point, i) => {
				const raw = point[s.key];
				const v = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
				return { i, v };
			});

			const dots = values
				.filter((p): p is { i: number; v: number } => p.v !== null)
				.map((p) => ({
					key: `${s.key}-${p.i}`,
					cx: xAt(p.i),
					cy: yAt(p.v),
				}));

			let pb: { cx: number; cy: number } | null = null;
			if (s.showPB) {
				let bestIndex = -1;
				let best = Number.NEGATIVE_INFINITY;
				for (const p of values) {
					if (p.v !== null && p.v > best) {
						best = p.v;
						bestIndex = p.i;
					}
				}
				if (bestIndex >= 0) {
					pb = { cx: xAt(bestIndex), cy: yAt(best) };
				}
			}

			const activeValue = active == null ? null : (values[active]?.v ?? null);

			return {
				key: s.key,
				name: s.name,
				color: s.color,
				strokeWidth: s.strokeWidth ?? 2.5,
				path: generator(values) ?? "",
				dots,
				pb,
				active:
					activeValue === null || active === null
						? null
						: { cx: xAt(active), cy: yAt(activeValue) },
			};
		});
	});

	protected readonly legend = computed<LegendItem[]>(() =>
		this.series().map((s) => ({
			key: s.key,
			name: s.name,
			color: s.color,
			hidden: this.hidden().has(s.key),
		})),
	);

	protected readonly tooltipHeader = computed(() => {
		const index = this.activeIndex();
		if (index === null) return "";
		const point = this.data()[index];
		const raw = point?.[this.xKey()];
		const format = this.tooltipLabelFormatter();
		if (format) return format(raw, point);
		return raw == null ? "" : String(raw);
	});

	protected readonly tooltipRows = computed<TooltipRow[]>(() => {
		const index = this.activeIndex();
		if (index === null) return [];
		const point = this.data()[index];
		if (!point) return [];

		const rows: TooltipRow[] = [];
		for (const s of this.visibleSeries()) {
			const raw = point[s.key];
			if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
			rows.push({
				key: s.key,
				name: s.name,
				color: s.color,
				value: s.format ? s.format(raw) : raw.toFixed(1),
			});
		}
		return rows;
	});

	/** Tooltip box position, in container pixels. Follows the pointer. */
	protected readonly tooltipPosition = computed(() => {
		const at = this.pointer();
		if (!at) return null;
		return { left: at.x + 12, top: Math.max(0, at.y - 8) };
	});

	protected toggle(key: string): void {
		this.hidden.update((current) => {
			const next = new Set(current);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	}

	/**
	 * Snaps the crosshair to the nearest data point, which is what recharts'
	 * tooltip did -- the cursor never sits between two x positions.
	 */
	protected onPointerMove(event: MouseEvent): void {
		const container = this.plotRef()?.nativeElement;
		const count = this.data().length;
		if (!container || count === 0) return;

		const box = container.getBoundingClientRect();
		const x = event.clientX - box.left;
		this.pointer.set({ x, y: event.clientY - box.top });

		const { left, w } = this.plot();
		const ratio = w <= 0 ? 0 : (x - left) / w;
		const index = Math.round(ratio * (count - 1));
		this.activeIndex.set(Math.min(count - 1, Math.max(0, index)));
	}

	protected onPointerLeave(): void {
		this.activeIndex.set(null);
		this.pointer.set(null);
	}
}
