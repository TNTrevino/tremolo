import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from "@angular/core";

import {
	TremoloLineChartComponent,
	type TremoloReferenceLine,
	type TremoloSeries,
} from "../../../../shared/components/charts/tremolo-line-chart.component";
import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";
import { SelectComponent } from "../../../../shared/components/ui/select.component";
import type {
	ChartInterval,
	MultiMetricChartData,
} from "../../../../shared/models/chart.models";

/**
 * Port of frontend-react/src/features/dashboard/components/PerformanceChart.tsx.
 *
 * NPM, accuracy and total questions over time. NPM shows by default; the
 * other two start hidden and the legend turns them on. Carries the interval
 * selector and, for a teacher, the my-data / class-data toggle.
 */

/**
 * One row of the chart.
 *
 * The index signature is not decoration: `TremoloChartPoint` is
 * `Record<string, string | number>`, and an interface without one is not
 * assignable to it (TypeScript gives type *aliases* an implicit index
 * signature and interfaces none). Declaring it explicitly keeps the named
 * fields typed and makes the row usable as chart data without a cast.
 */
interface PerformancePoint {
	[key: string]: string | number;
	time: string;
	npm: number;
	accuracy: number;
	sessions: number;
	questions: number;
}

const ALL_SERIES: readonly TremoloSeries[] = [
	{
		key: "npm",
		name: "Notes Per Minute",
		color: "hsl(var(--primary))",
		format: (v) => v.toFixed(1),
	},
	{
		key: "accuracy",
		name: "Accuracy",
		color: "hsl(var(--brass))",
		format: (v) => `${v.toFixed(1)}%`,
	},
	{
		key: "questions",
		name: "Total Questions",
		color: "hsl(var(--destructive))",
		format: (v) => String(Math.round(v)),
	},
];

/** Hidden until the user clicks them in the legend. */
const INITIALLY_HIDDEN: readonly string[] = ["accuracy", "questions"];

/**
 * Zips the four independent series by index.
 *
 * They are not guaranteed to be the same length, so the longest wins and a
 * missing value reads as 0 -- carried over from React, where the same
 * `?? 0` kept a short accuracy series from truncating the NPM line.
 */
function transformChartData(data: MultiMetricChartData): PerformancePoint[] {
	const maxLength = Math.max(
		data.npm.length,
		data.accuracy.length,
		data.sessionCount.length,
		data.totalQuestions.length,
	);

	const combined: PerformancePoint[] = [];
	for (let i = 0; i < maxLength; i++) {
		combined.push({
			time:
				data.npm[i]?.x ||
				data.accuracy[i]?.x ||
				data.sessionCount[i]?.x ||
				data.totalQuestions[i]?.x ||
				"",
			npm: data.npm[i]?.y ?? 0,
			accuracy: data.accuracy[i]?.y ?? 0,
			sessions: data.sessionCount[i]?.y ?? 0,
			questions: data.totalQuestions[i]?.y ?? 0,
		});
	}
	return combined;
}

function formatXAxisLabel(timestamp: unknown, interval: ChartInterval): string {
	if (typeof timestamp !== "string" || !timestamp) return "";
	const date = new Date(timestamp);
	switch (interval) {
		case "month":
			return date.toLocaleDateString("en-US", {
				month: "short",
				year: "2-digit",
			});
		case "year":
			return date.toLocaleDateString("en-US", { year: "numeric" });
		default:
			return date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
	}
}

function formatTooltipHeader(
	timestamp: unknown,
	interval: ChartInterval,
): string {
	if (typeof timestamp !== "string" || !timestamp) return "";
	const date = new Date(timestamp);
	if (interval === "year") {
		return date.toLocaleDateString("en-US", { year: "numeric" });
	}
	if (interval === "month") {
		return date.toLocaleDateString("en-US", {
			month: "long",
			year: "numeric",
		});
	}
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

@Component({
	selector: "app-performance-chart",
	imports: [
		ButtonComponent,
		SelectComponent,
		TremoloLineChartComponent,
		...CARD_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: "block" },
	templateUrl: "./performance-chart.component.html",
})
export class PerformanceChartComponent {
	readonly chartData = input.required<MultiMetricChartData>();
	readonly interval = input.required<ChartInterval>();
	readonly isTeacher = input(false);
	readonly viewMode = input<"my" | "class">("my");

	readonly intervalChange = output<ChartInterval>();
	readonly viewModeChange = output<"my" | "class">();

	protected readonly series = ALL_SERIES;
	protected readonly initiallyHidden = INITIALLY_HIDDEN;

	protected readonly points = computed(() =>
		transformChartData(this.chartData()),
	);

	/** Under two points there is no trend to draw; React showed a note. */
	protected readonly hasTrend = computed(() => this.points().length >= 2);

	protected readonly referenceLines = computed<TremoloReferenceLine[]>(() => {
		const points = this.points();
		if (points.length < 2) return [];
		const avg = points.reduce((sum, p) => sum + p.npm, 0) / points.length;
		return [{ value: avg, label: `avg ${avg.toFixed(1)}` }];
	});

	protected readonly xTickFormatter = computed(
		() => (value: unknown) => formatXAxisLabel(value, this.interval()),
	);

	protected readonly tooltipLabelFormatter = computed(
		() => (value: unknown) => formatTooltipHeader(value, this.interval()),
	);

	protected onIntervalChange(value: string): void {
		this.intervalChange.emit(value as ChartInterval);
	}
}
