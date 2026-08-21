import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	signal,
} from "@angular/core";

import type { DailyActivityCount } from "../../models/chart.models";

/**
 * Port of frontend-react/src/shared/components/charts/ActivityHeatmap.tsx.
 *
 * GitHub / Monkeytype-style activity heatmap: a 52-week grid of daily
 * squares coloured by game count, month labels along the top, Mon/Wed/Fri
 * down the left, and a hover tooltip.
 *
 * **This one never used recharts.** React drew it by hand in SVG, so this is
 * a straight port and the chart-library decision does not touch it -- which
 * is what PLAN.md §2 anticipated when it said "the heatmap is simple enough
 * to hand-roll in SVG".
 *
 * Every constant, the quartile colour ramp and the grid walk are carried over
 * unchanged; the only structural change is that React's `useMemo` chain is a
 * `computed` chain and its `useState` tooltip is a `signal`.
 */

const CELL_SIZE = 12;
const CELL_GAP = 3;
const CELL_RADIUS = 2;
const WEEKS = 52;
const DAYS_IN_WEEK = 7;

/** Space reserved for the day-of-week labels on the left. */
const LEFT_LABEL_WIDTH = 32;
/** Space reserved for the month labels on top. */
const TOP_LABEL_HEIGHT = 16;

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""] as const;

/**
 * Five-level ramp, empty -> max, off the primary token. Level 0 is a quiet
 * muted wash so an empty day is visible without reading as activity.
 */
const COLOR_LEVELS = [
	"hsl(var(--muted) / 0.5)",
	"hsl(var(--primary) / 0.25)",
	"hsl(var(--primary) / 0.45)",
	"hsl(var(--primary) / 0.7)",
	"hsl(var(--primary) / 1)",
] as const;

type Quartiles = readonly [number, number, number];

interface GridCell {
	/** "YYYY-MM-DD" */
	date: string;
	/** 0 = Sunday … 6 = Saturday */
	dayOfWeek: number;
	/** 0 = leftmost column */
	weekIndex: number;
	count: number;
}

interface RenderedCell {
	date: string;
	x: number;
	y: number;
	fill: string;
}

interface MonthLabel {
	key: string;
	label: string;
	x: number;
}

interface DayLabel {
	key: string;
	label: string;
	y: number;
}

interface TooltipState {
	x: number;
	y: number;
	/** Bold half: "No games" / "3 games". */
	games: string;
	/** Muted half: "on Wed, Aug 20, 2026". */
	on: string;
}

function getColorLevel(count: number, quartiles: Quartiles): number {
	if (count === 0) return 0;
	if (count <= quartiles[0]) return 1;
	if (count <= quartiles[1]) return 2;
	if (count <= quartiles[2]) return 3;
	return 4;
}

/** Quartile thresholds over the non-zero days only. */
function computeQuartiles(values: readonly number[]): Quartiles {
	const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
	if (sorted.length === 0) return [1, 2, 3];
	const q = (p: number): number =>
		sorted[Math.min(Math.floor(p * sorted.length), sorted.length - 1)] ?? 0;
	return [q(0.25), q(0.5), q(0.75)];
}

function formatDateStr(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function formatTooltipDate(dateStr: string): string {
	const d = new Date(dateStr + "T00:00:00");
	return d.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

interface Grid {
	cells: GridCell[];
	monthLabels: { label: string; weekIndex: number }[];
	totalWeeks: number;
}

/**
 * Walks day by day from the Sunday that starts the grid to today.
 *
 * The rightmost column is the current, possibly partial, week; weeks start
 * on Sunday (GitHub's convention). A month label is emitted when the month
 * changes at the very start of a week, so it sits above its first full
 * column rather than mid-column.
 */
function buildGrid(data: readonly DailyActivityCount[]): Grid {
	const countMap = new Map<string, number>();
	for (const d of data) countMap.set(d.date, d.game_count);

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const totalDays = WEEKS * DAYS_IN_WEEK + today.getDay();
	const startDate = new Date(today);
	startDate.setDate(startDate.getDate() - totalDays);

	const cells: GridCell[] = [];
	const monthLabels: { label: string; weekIndex: number }[] = [];
	let lastMonth = -1;

	const cursor = new Date(startDate);
	let weekIndex = 0;

	while (cursor <= today) {
		const dayOfWeek = cursor.getDay();
		const dateStr = formatDateStr(cursor);
		const month = cursor.getMonth();

		if (month !== lastMonth && dayOfWeek <= 1) {
			monthLabels.push({
				label: cursor.toLocaleDateString("en-US", { month: "short" }),
				weekIndex,
			});
			lastMonth = month;
		} else if (month !== lastMonth) {
			// Changed mid-week: remember it so the next week does not
			// re-announce the same month one column late.
			lastMonth = month;
		}

		cells.push({
			date: dateStr,
			dayOfWeek,
			weekIndex,
			count: countMap.get(dateStr) ?? 0,
		});

		cursor.setDate(cursor.getDate() + 1);
		if (cursor.getDay() === 0 && cursor <= today) weekIndex++;
	}

	return { cells, monthLabels, totalWeeks: weekIndex + 1 };
}

@Component({
	selector: "app-activity-heatmap",
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: "block" },
	templateUrl: "./activity-heatmap.component.html",
})
export class ActivityHeatmapComponent {
	readonly data = input<readonly DailyActivityCount[]>([]);

	protected readonly tooltip = signal<TooltipState | null>(null);

	protected readonly cellSize = CELL_SIZE;
	protected readonly cellRadius = CELL_RADIUS;
	protected readonly colorLevels = COLOR_LEVELS;

	private readonly grid = computed(() => buildGrid(this.data()));

	private readonly cellsByDate = computed(() => {
		const map = new Map<string, GridCell>();
		for (const cell of this.grid().cells) map.set(cell.date, cell);
		return map;
	});

	protected readonly cells = computed<RenderedCell[]>(() => {
		const { cells } = this.grid();
		const quartiles = computeQuartiles(cells.map((c) => c.count));
		return cells.map((cell) => ({
			date: cell.date,
			x: LEFT_LABEL_WIDTH + cell.weekIndex * (CELL_SIZE + CELL_GAP),
			y: TOP_LABEL_HEIGHT + cell.dayOfWeek * (CELL_SIZE + CELL_GAP),
			fill:
				COLOR_LEVELS[getColorLevel(cell.count, quartiles)] ?? COLOR_LEVELS[0],
		}));
	});

	protected readonly monthLabels = computed<MonthLabel[]>(() =>
		this.grid().monthLabels.map((m) => ({
			key: `month-${m.weekIndex}-${m.label}`,
			label: m.label,
			x: LEFT_LABEL_WIDTH + m.weekIndex * (CELL_SIZE + CELL_GAP),
		})),
	);

	protected readonly dayLabels = computed<DayLabel[]>(() =>
		DAY_LABELS.map((label, i) => ({
			key: `day-${i}`,
			label,
			y: rowY(i),
		})).filter((d) => d.label !== ""),
	);

	protected readonly monthLabelY = TOP_LABEL_HEIGHT - 4;

	protected readonly svgWidth = computed(
		() => LEFT_LABEL_WIDTH + this.grid().totalWeeks * (CELL_SIZE + CELL_GAP),
	);

	protected readonly svgHeight =
		TOP_LABEL_HEIGHT + DAYS_IN_WEEK * (CELL_SIZE + CELL_GAP);

	/**
	 * One listener on the `<svg>` rather than 365 on the rects -- React used
	 * the same delegation, reading `data-date` off the event target.
	 */
	protected onMouseMove(event: MouseEvent): void {
		const target = event.target as SVGElement | null;
		const date = target?.getAttribute("data-date");
		if (!date) {
			this.tooltip.set(null);
			return;
		}
		const cell = this.cellsByDate().get(date);
		if (!cell) return;

		const svg = event.currentTarget as SVGSVGElement;
		const box = svg.getBoundingClientRect();
		this.tooltip.set({
			x: event.clientX - box.left,
			y: event.clientY - box.top - 8,
			games:
				cell.count === 0
					? "No games"
					: `${cell.count} game${cell.count === 1 ? "" : "s"}`,
			on: `on ${formatTooltipDate(cell.date)}`,
		});
	}

	protected onMouseLeave(): void {
		this.tooltip.set(null);
	}
}

function rowY(index: number): number {
	return TOP_LABEL_HEIGHT + index * (CELL_SIZE + CELL_GAP) + CELL_SIZE * 0.8;
}
