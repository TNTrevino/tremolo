/**
 * GitHub / Monkeytype-style activity heatmap.
 *
 * Renders a 52-week grid of daily squares coloured by game count.
 * - The rightmost column is the current (possibly partial) week.
 * - Weeks start on Sunday (GitHub convention).
 * - Month labels appear along the top when a new month begins.
 * - Day-of-week labels (Mon, Wed, Fri) on the left.
 * - Hover tooltip shows the date and game count.
 */

import { memo, useCallback, useMemo, useState } from "react";
import type { DailyActivityCount } from "@/services/api/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Colour scale                                                      */
/* ------------------------------------------------------------------ */

/**
 * 5-level colour ramp (empty → max) using the primary HSL variable.
 * Level 0 uses the muted border colour so empty cells are visible but quiet.
 */
const COLOR_LEVELS = [
	"hsl(var(--muted) / 0.5)",
	"hsl(var(--primary) / 0.25)",
	"hsl(var(--primary) / 0.45)",
	"hsl(var(--primary) / 0.7)",
	"hsl(var(--primary) / 1)",
] as const;

type Quartiles = [number, number, number];

function getColorLevel(count: number, quartiles: Quartiles): number {
	if (count === 0) return 0;
	if (count <= quartiles[0]) return 1;
	if (count <= quartiles[1]) return 2;
	if (count <= quartiles[2]) return 3;
	return 4;
}

/** Compute quartile thresholds from non-zero values. */
function computeQuartiles(values: number[]): Quartiles {
	const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
	if (sorted.length === 0) return [1, 2, 3];
	const q = (p: number): number => sorted[Math.min(Math.floor(p * sorted.length), sorted.length - 1)]!;
	return [q(0.25), q(0.5), q(0.75)];
}

/* ------------------------------------------------------------------ */
/*  Grid builder                                                      */
/* ------------------------------------------------------------------ */

interface GridCell {
	date: string; // "2026-04-05"
	dayOfWeek: number; // 0 = Sun … 6 = Sat
	weekIndex: number; // 0 = leftmost column
	count: number;
}

interface MonthLabel {
	label: string;
	weekIndex: number;
}

function buildGrid(data: DailyActivityCount[]): {
	cells: GridCell[];
	monthLabels: MonthLabel[];
	totalWeeks: number;
} {
	// Build a lookup map: date string → count.
	const countMap = new Map<string, number>();
	for (const d of data) {
		countMap.set(d.date, d.game_count);
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// Walk back to find the Sunday that starts the grid.
	// The grid ends on today. The rightmost column is the partial week
	// containing today. We want ~52 full weeks before that.
	const todayDay = today.getDay(); // 0=Sun
	// Number of days from the grid start to today:
	// 52 full weeks + todayDay days into the current partial week.
	const totalDays = WEEKS * DAYS_IN_WEEK + todayDay;
	const startDate = new Date(today);
	startDate.setDate(startDate.getDate() - totalDays);

	const cells: GridCell[] = [];
	const monthLabels: MonthLabel[] = [];
	let lastMonth = -1;

	const cursor = new Date(startDate);
	let weekIndex = 0;

	while (cursor <= today) {
		const dayOfWeek = cursor.getDay();
		const dateStr = formatDateStr(cursor);

		// Track month labels — emit when the month changes and we're near
		// the start of a week so the label sits above its first full week.
		const month = cursor.getMonth();
		if (month !== lastMonth && dayOfWeek <= 1) {
			monthLabels.push({
				label: cursor.toLocaleDateString("en-US", { month: "short" }),
				weekIndex,
			});
			lastMonth = month;
		} else if (month !== lastMonth && dayOfWeek > 1) {
			// Month changed mid-week; record it but don't duplicate.
			lastMonth = month;
		}

		cells.push({
			date: dateStr,
			dayOfWeek,
			weekIndex,
			count: countMap.get(dateStr) ?? 0,
		});

		cursor.setDate(cursor.getDate() + 1);
		// A new week starts every Sunday.
		if (cursor.getDay() === 0 && cursor <= today) {
			weekIndex++;
		}
	}

	return { cells, monthLabels, totalWeeks: weekIndex + 1 };
}

function formatDateStr(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

/* ------------------------------------------------------------------ */
/*  Tooltip                                                           */
/* ------------------------------------------------------------------ */

interface TooltipState {
	x: number;
	y: number;
	date: string;
	count: number;
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

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export interface ActivityHeatmapProps {
	data: DailyActivityCount[];
}

export const ActivityHeatmap = memo(function ActivityHeatmap({ data }: ActivityHeatmapProps) {
	const [tooltip, setTooltip] = useState<TooltipState | null>(null);

	const { cells, monthLabels, totalWeeks, quartiles } = useMemo(() => {
		const grid = buildGrid(data);
		const q = computeQuartiles(grid.cells.map((c) => c.count));
		return { ...grid, quartiles: q };
	}, [data]);

	/** Lookup map for event delegation: date string → cell data. */
	const cellByDate = useMemo(() => {
		const map = new Map<string, GridCell>();
		for (const c of cells) map.set(c.date, c);
		return map;
	}, [cells]);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<SVGSVGElement>) => {
			const target = e.target as SVGElement;
			const date = target.getAttribute("data-date");
			if (!date) {
				setTooltip(null);
				return;
			}
			const cell = cellByDate.get(date);
			if (!cell) return;
			const svgRect = e.currentTarget.getBoundingClientRect();
			setTooltip({
				x: e.clientX - svgRect.left,
				y: e.clientY - svgRect.top - 8,
				date: cell.date,
				count: cell.count,
			});
		},
		[cellByDate],
	);

	const handleMouseLeave = useCallback(() => setTooltip(null), []);

	const svgWidth = LEFT_LABEL_WIDTH + totalWeeks * (CELL_SIZE + CELL_GAP);
	const svgHeight = TOP_LABEL_HEIGHT + DAYS_IN_WEEK * (CELL_SIZE + CELL_GAP);

	return (
		<div className="relative">
			<svg
				viewBox={`0 0 ${svgWidth} ${svgHeight}`}
				className="block w-full h-auto"
				role="img"
				aria-label="Activity heatmap showing games played per day"
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
			>
				{/* Month labels */}
				{monthLabels.map((m) => (
					<text
						key={`month-${m.weekIndex}-${m.label}`}
						x={LEFT_LABEL_WIDTH + m.weekIndex * (CELL_SIZE + CELL_GAP)}
						y={TOP_LABEL_HEIGHT - 4}
						className="fill-muted-foreground"
						fontSize={10}
					>
						{m.label}
					</text>
				))}

				{/* Day-of-week labels */}
				{DAY_LABELS.map((label, i) =>
					label ? (
						<text
							key={`day-${i}`}
							x={0}
							y={
								TOP_LABEL_HEIGHT +
								i * (CELL_SIZE + CELL_GAP) +
								CELL_SIZE * 0.8
							}
							className="fill-muted-foreground"
							fontSize={10}
						>
							{label}
						</text>
					) : null,
				)}

				{/* Cells */}
				{cells.map((cell) => {
					const x =
						LEFT_LABEL_WIDTH + cell.weekIndex * (CELL_SIZE + CELL_GAP);
					const y =
						TOP_LABEL_HEIGHT +
						cell.dayOfWeek * (CELL_SIZE + CELL_GAP);
					const level = getColorLevel(cell.count, quartiles);
					return (
						<rect
							key={cell.date}
							data-date={cell.date}
							x={x}
							y={y}
							width={CELL_SIZE}
							height={CELL_SIZE}
							rx={CELL_RADIUS}
							ry={CELL_RADIUS}
							fill={COLOR_LEVELS[level]}
							className="transition-colors duration-100"
						/>
					);
				})}
			</svg>

			{/* Tooltip */}
			{tooltip && (
				<div
					className="absolute pointer-events-none z-10 rounded-md border border-border bg-card/95 px-2 py-1 shadow-lg backdrop-blur-sm text-xs"
					style={{
						left: tooltip.x,
						top: tooltip.y,
						transform: "translate(-50%, -100%)",
					}}
				>
					<span className="font-semibold text-foreground">
						{tooltip.count === 0
							? "No games"
							: `${tooltip.count} game${tooltip.count === 1 ? "" : "s"}`}
					</span>
					<span className="text-muted-foreground ml-1">
						on {formatTooltipDate(tooltip.date)}
					</span>
				</div>
			)}

			{/* Legend */}
			<div className="flex items-center justify-end gap-1.5 mt-2 text-xs text-muted-foreground">
				<span>Less</span>
				{COLOR_LEVELS.map((color, i) => (
					<span
						key={i}
						className="inline-block rounded-sm"
						style={{
							width: CELL_SIZE,
							height: CELL_SIZE,
							backgroundColor: color,
						}}
					/>
				))}
				<span>More</span>
			</div>
		</div>
	);
});
