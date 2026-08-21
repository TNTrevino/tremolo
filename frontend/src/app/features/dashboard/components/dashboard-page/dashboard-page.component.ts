import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";

import { AuthStore } from "../../../../auth/services/auth.store";
import { ActivityHeatmapComponent } from "../../../../shared/components/charts/activity-heatmap.component";
import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";
import type {
	ChartInterval,
	MultiMetricChartData,
} from "../../../../shared/models/chart.models";
import { UserService } from "../../../../shared/services/user.service";
import { getErrorMessage } from "../../../../shared/utils/error.utils";
import { DashboardSkeletonComponent } from "../dashboard-skeleton/dashboard-skeleton.component";
import { DashboardStatsComponent } from "../dashboard-stats/dashboard-stats.component";
import { PerformanceChartComponent } from "../performance-chart/performance-chart.component";
import { TeacherDashboardComponent } from "../teacher-dashboard/teacher-dashboard.component";
import { UserProfileCardComponent } from "../user-profile-card/user-profile-card.component";

/**
 * Port of frontend-react/src/pages/DashboardPage.tsx and of the
 * `useDashboardData` hook it read from -- the hook's *semantics* survive
 * (which endpoint, what makes it refetch, how the three loading flags
 * combine); its TanStack machinery does not (D6).
 *
 * Four resources, one per endpoint, exactly as React had four queries:
 *
 * | resource       | endpoint                              | refetches when      |
 * | -------------- | ------------------------------------- | ------------------- |
 * | `profile`      | `/api/users/:id/general-info`         | the signed-in id    |
 * | `chart`        | `/api/charts/user/:id/metrics`        | id or interval      |
 * | `classMetrics` | `/api/charts/teacher/class-metrics`   | interval (teachers) |
 * | `activity`     | `/api/note-game/activity`             | the signed-in id    |
 *
 * `params` returning `undefined` is how a resource stays idle, and it is the
 * port of TanStack's `enabled`: a student's `classMetrics` never fires (the
 * endpoint 403s for them), and nothing fires before the store has a user.
 *
 * **The skeleton keys on `status() === "loading"`, not on `isLoading()`.**
 * `isLoading()` is also true while *reloading*, and using it would blank the
 * page on every refetch. React's `isPending` was false whenever data was on
 * screen; `"loading"` is the signal that means the same thing. Changing the
 * interval does re-enter `"loading"` -- and did in React too, because the
 * new interval was a new query key with nothing cached behind it.
 */
@Component({
	selector: "app-dashboard-page",
	imports: [
		ActivityHeatmapComponent,
		DashboardSkeletonComponent,
		DashboardStatsComponent,
		PerformanceChartComponent,
		TeacherDashboardComponent,
		UserProfileCardComponent,
		...CARD_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./dashboard-page.component.html",
})
export class DashboardPageComponent {
	private readonly users = inject(UserService);
	private readonly store = inject(AuthStore);

	protected readonly interval = signal<ChartInterval>("day");
	protected readonly viewMode = signal<"my" | "class">("my");

	/**
	 * The Google callback's "Your Google account has been linked…" message.
	 * Read once at construction; `takeNotice()` clears it so a reload does
	 * not show it again (react-router's location state did not survive one
	 * either). See phase-3-subfeature-1-handoff.md §2.5.
	 */
	protected readonly notice = signal(this.store.takeNotice());

	protected readonly isTeacher = computed(
		() => this.store.role() === "TEACHER",
	);

	protected readonly profile = rxResource({
		params: () => this.store.user()?.id,
		stream: ({ params }) => this.users.getProfile(params),
	});

	protected readonly chart = rxResource({
		params: () => {
			const id = this.store.user()?.id;
			if (id === undefined) return undefined;
			return { id, ...chartQuery(this.interval()) };
		},
		stream: ({ params }) =>
			this.users.getStats(params.id, {
				interval: params.interval,
				days: params.days,
			}),
	});

	protected readonly classMetrics = rxResource({
		params: () => {
			if (!this.isTeacher()) return undefined;
			return chartQuery(this.interval());
		},
		stream: ({ params }) => this.users.getClassMetrics(params),
	});

	protected readonly activity = rxResource({
		params: () => this.store.user()?.id,
		stream: () => this.users.getActivityHeatmap(),
		defaultValue: [],
	});

	/** First load only. A refetch keeps the old dashboard on screen. */
	protected readonly showSkeleton = computed(
		() =>
			this.profile.status() === "loading" ||
			this.chart.status() === "loading" ||
			this.classMetrics.status() === "loading",
	);

	/**
	 * React's `isError || !user || !stats || !chartData`. A student's idle
	 * `classMetrics` has no error and no value, so it is asked about only
	 * through its error -- never through `hasValue()`.
	 */
	protected readonly failure = computed(() => {
		const error =
			this.profile.error() ?? this.chart.error() ?? this.classMetrics.error();
		if (error) return getErrorMessage(error);
		if (!this.profile.hasValue() || !this.chart.hasValue()) {
			return "Unable to load dashboard data. Please try again later.";
		}
		return null;
	});

	protected readonly stats = computed(() => {
		const user = this.profile.value();
		return {
			totalSessions: user?.totalSessions ?? 0,
			totalQuestions: user?.totalQuestions ?? 0,
			avgNPM: user?.averageNPM ?? 0,
			avgAccuracy: user?.averageAccuracy ?? 0,
		};
	});

	protected readonly timeReading = computed(() =>
		formatTimeReading(this.stats().totalSessions),
	);

	/** A teacher looking at class data sees the aggregate; everyone else, their own. */
	protected readonly displayChartData = computed<MultiMetricChartData>(() => {
		const classData = this.classMetrics.hasValue()
			? this.classMetrics.value()
			: null;
		if (this.isTeacher() && this.viewMode() === "class" && classData) {
			return classData;
		}
		return this.chart.value() ?? EMPTY_CHART;
	});
}

const EMPTY_CHART: MultiMetricChartData = {
	npm: [],
	accuracy: [],
	sessionCount: [],
	totalQuestions: [],
};

/**
 * `days` is only sent for the daily view, and it is 30 -- React's
 * `days: interval === "day" ? 30 : undefined`.
 */
function chartQuery(interval: ChartInterval): {
	interval: ChartInterval;
	days: number | undefined;
} {
	return { interval, days: interval === "day" ? 30 : undefined };
}

/**
 * "Time reading" is an estimate, not a measurement: the Go service stores no
 * session duration, so React multiplied sessions by an assumed five minutes.
 * Carried over so the number on the dashboard does not silently change.
 */
function formatTimeReading(totalSessions: number): string {
	const totalMinutes = totalSessions * 5;
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
