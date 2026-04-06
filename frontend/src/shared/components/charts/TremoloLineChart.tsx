/**
 * Shared line chart wrapper that encodes the Tremolo house style:
 * - No resting dots, crosshair cursor on hover, formatted tooltip
 * - Soft horizontal-only grid, clean axes
 * - Interactive legend (click to toggle series visibility)
 * - Optional average reference line and personal-best highlight
 *
 * Used by both the post-game results chart and the dashboard performance chart.
 */

import { useMemo, useState } from "react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ReferenceLine,
	ResponsiveContainer,
} from "recharts";
import type { TooltipProps } from "recharts";

export interface TremoloSeries {
	/** Key in the data point object that holds this series' value */
	key: string;
	/** Display name shown in legend and tooltip */
	name: string;
	/** CSS color string (hsl/hex/css var) */
	color: string;
	/** Stroke width; defaults to 2.5 */
	strokeWidth?: number;
	/** Optional value formatter for the tooltip (e.g. v => `${v.toFixed(1)}%`) */
	format?: (value: number) => string;
	/** If true, highlights the maximum point in this series with a personal-best ring */
	showPB?: boolean;
}

export interface TremoloReferenceLine {
	/** Which Y value to draw the horizontal line at */
	value: number;
	/** Short label rendered at the right edge of the line */
	label?: string;
	/** CSS color; defaults to the muted foreground color */
	color?: string;
}

export interface TremoloLineChartProps {
	data: Array<Record<string, unknown>>;
	series: TremoloSeries[];
	/** Field in each data point used for the X axis */
	xKey: string;
	/** Height in pixels; defaults to 320 */
	height?: number;
	/** Formats raw X values to tick labels */
	xTickFormatter?: (value: unknown) => string;
	/** Formats the tooltip header (the bold line above the series values) */
	tooltipLabelFormatter?: (
		value: unknown,
		payload?: Record<string, unknown>,
	) => string;
	/** Horizontal reference lines (e.g. average) */
	referenceLines?: TremoloReferenceLine[];
	/** Whether to render the legend row; defaults to true */
	showLegend?: boolean;
	/** Series keys that start hidden (user can click legend to enable) */
	initialHiddenSeries?: string[];
}

/**
 * Custom tooltip with Tremolo theming and per-series value formatting.
 */
function TremoloTooltip({
	active,
	payload,
	label,
	series,
	tooltipLabelFormatter,
}: TooltipProps<number, string> & {
	series: TremoloSeries[];
	tooltipLabelFormatter?: TremoloLineChartProps["tooltipLabelFormatter"];
}) {
	if (!active || !payload || payload.length === 0) {
		return null;
	}

	const headerText = tooltipLabelFormatter
		? tooltipLabelFormatter(label, payload[0]?.payload as Record<string, unknown>)
		: String(label);

	return (
		<div
			className="rounded-lg border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm"
			style={{ borderWidth: 1 }}
		>
			<div className="text-xs font-semibold text-foreground mb-1">
				{headerText}
			</div>
			{payload.map((entry) => {
				const seriesConfig = series.find((s) => s.key === entry.dataKey);
				if (!seriesConfig || entry.value == null) return null;
				const formatted = seriesConfig.format
					? seriesConfig.format(entry.value as number)
					: (entry.value as number).toFixed(1);
				return (
					<div
						key={entry.dataKey as string}
						className="flex items-center gap-2 text-xs"
					>
						<span
							className="inline-block h-2 w-2 rounded-full"
							style={{ backgroundColor: seriesConfig.color }}
						/>
						<span className="text-muted-foreground">{seriesConfig.name}</span>
						<span className="ml-auto font-mono font-semibold text-foreground">
							{formatted}
						</span>
					</div>
				);
			})}
		</div>
	);
}

/**
 * Renders a personal-best marker at the given data point.
 */
function PBDot(props: {
	cx?: number;
	cy?: number;
	color: string;
	value?: number;
	isMax: boolean;
}) {
	const { cx, cy, color, isMax } = props;
	if (!isMax || cx == null || cy == null) return null;
	return (
		<g>
			<circle
				cx={cx}
				cy={cy}
				r={6}
				fill="hsl(var(--card))"
				stroke={color}
				strokeWidth={2.5}
			/>
			<circle cx={cx} cy={cy} r={2.5} fill={color} />
		</g>
	);
}

export function TremoloLineChart({
	data,
	series,
	xKey,
	height = 320,
	xTickFormatter,
	tooltipLabelFormatter,
	referenceLines,
	showLegend = true,
	initialHiddenSeries,
}: TremoloLineChartProps) {
	const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(
		() => new Set(initialHiddenSeries ?? []),
	);

	/** Precompute the index of the max value for each PB-enabled series. */
	const pbIndexByKey = useMemo(() => {
		const map = new Map<string, number>();
		for (const s of series) {
			if (!s.showPB) continue;
			let maxIdx = -1;
			let maxVal = -Infinity;
			data.forEach((point, i) => {
				const v = point[s.key];
				if (typeof v === "number" && v > maxVal) {
					maxVal = v;
					maxIdx = i;
				}
			});
			if (maxIdx >= 0) map.set(s.key, maxIdx);
		}
		return map;
	}, [data, series]);

	// Recharts types `dataKey` loosely (string | number | function); we only use string keys.
	const handleLegendClick = (payload: { dataKey?: unknown }) => {
		const key =
			typeof payload.dataKey === "string" ? payload.dataKey : String(payload.dataKey ?? "");
		setHiddenSeries((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const legendFormatter = (value: string, entry: { dataKey?: unknown }) => {
		const key =
			typeof entry.dataKey === "string" ? entry.dataKey : String(entry.dataKey ?? "");
		const isHidden = hiddenSeries.has(key);
		return (
			<span
				className={
					isHidden
						? "text-muted-foreground/40 text-xs select-none"
						: "text-muted-foreground text-xs select-none"
				}
			>
				{value}
			</span>
		);
	};

	return (
		<ResponsiveContainer width="100%" height={height}>
			<LineChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
				<CartesianGrid
					vertical={false}
					stroke="hsl(var(--border))"
					strokeOpacity={0.4}
				/>
				<XAxis
					dataKey={xKey}
					tickLine={false}
					axisLine={false}
					tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
					tickFormatter={xTickFormatter}
					minTickGap={16}
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
					width={40}
				/>
				<Tooltip
					cursor={{
						stroke: "hsl(var(--muted-foreground))",
						strokeWidth: 1,
						strokeDasharray: "3 3",
						strokeOpacity: 0.5,
					}}
					content={
						<TremoloTooltip
							series={series}
							tooltipLabelFormatter={tooltipLabelFormatter}
						/>
					}
				/>
				{showLegend && (
					<Legend
						iconType="plainline"
						wrapperStyle={{ paddingTop: 12, cursor: "pointer" }}
						onClick={handleLegendClick}
						formatter={legendFormatter}
					/>
				)}
				{referenceLines?.map((ref, idx) => (
					<ReferenceLine
						key={`ref-${idx}`}
						y={ref.value}
						stroke={ref.color ?? "hsl(var(--muted-foreground))"}
						strokeDasharray="4 4"
						strokeOpacity={0.5}
						label={
							ref.label
								? {
										value: ref.label,
										position: "right",
										fill: "hsl(var(--muted-foreground))",
										fontSize: 10,
									}
								: undefined
						}
					/>
				))}
				{series.map((s) => {
					const pbIdx = pbIndexByKey.get(s.key);
					const defaultDot = {
						r: 3,
						fill: s.color,
						strokeWidth: 0,
					};
					const renderDot =
						s.showPB && pbIdx != null
							? (dotProps: { cx?: number; cy?: number; index?: number }) => {
									if (dotProps.index === pbIdx) {
										return (
											<PBDot
												key={`pb-${s.key}-${dotProps.index}`}
												cx={dotProps.cx}
												cy={dotProps.cy}
												color={s.color}
												isMax
											/>
										);
									}
									// Regular small dot
									return (
										<circle
											key={`dot-${s.key}-${dotProps.index}`}
											cx={dotProps.cx}
											cy={dotProps.cy}
											r={3}
											fill={s.color}
										/>
									);
								}
							: defaultDot;
					return (
						<Line
							key={s.key}
							type="monotone"
							dataKey={s.key}
							name={s.name}
							stroke={s.color}
							strokeWidth={s.strokeWidth ?? 2.5}
							strokeLinecap="round"
							dot={renderDot}
							activeDot={{
								r: 5,
								strokeWidth: 2,
								stroke: "hsl(var(--card))",
								fill: s.color,
							}}
							hide={hiddenSeries.has(s.key)}
							isAnimationActive
							animationDuration={600}
							animationEasing="ease-out"
						/>
					);
				})}
			</LineChart>
		</ResponsiveContainer>
	);
}
