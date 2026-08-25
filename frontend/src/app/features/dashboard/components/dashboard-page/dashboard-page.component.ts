import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";

import { ClassesService } from "@features/classes/services/classes.service";

import { AuthStore } from "../../../../auth/services/auth.store";
import { ActivityHeatmapComponent } from "../../../../shared/components/charts/activity-heatmap.component";
import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";
import type {
	ChartInterval,
	MultiMetricChartData,
} from "../../../../shared/models/chart.models";
import { UserService } from "../../../../shared/services/user.service";
import { formatTimeReading } from "../../../../shared/utils/date.utils";
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
 * Five resources, one per endpoint -- the four React had, plus `classList`
 * for the teacher card's roster count:
 *
 * | resource       | endpoint                              | refetches when              |
 * | -------------- | ------------------------------------- | ---------------------------- |
 * | `profile`      | `/api/users/:id/general-info`         | the signed-in id            |
 * | `chart`        | `/api/charts/user/:id/metrics`        | id or interval              |
 * | `classMetrics` | `/api/charts/teacher/class-metrics`   | interval (teachers)         |
 * | `activity`     | `/api/note-game/activity`             | the signed-in id            |
 * | `classList`    | `/api/classes`                        | the signed-in id (teachers) |
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
	private readonly classesApi = inject(ClassesService);

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

	/**
	 * The teacher card's "Number of Students", read from the class list the
	 * /classes page already uses -- no new endpoint. Idle for anyone but a
	 * teacher.
	 *
	 * Deliberately NOT in `showSkeleton()` or `failure()`: a slow or failing
	 * class list must not blank or error the whole dashboard -- it degrades
	 * to the "Coming soon" label instead (`studentCount() === null`).
	 *
	 * No `defaultValue` here: `defaultValue: []` would make `hasValue()`
	 * true while the request is still in flight and flash "0" before the
	 * real count arrives.
	 */
	protected readonly classList = rxResource({
		params: () => (this.isTeacher() ? this.store.user()?.id : undefined),
		stream: () => this.classesApi.getTeacherClasses(),
	});

	/**
	 * Sum of each class's roster. A student enrolled in two of the
	 * teacher's classes counts twice here; an exact dedup needs a
	 * server-side `count(distinct student_id)` -- follow-up.
	 */
	protected readonly studentCount = computed(() =>
		this.classList.hasValue()
			? this.classList.value().reduce((total, c) => total + c.studentCount, 0)
			: null,
	);

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

	/**
	 * The four stat tiles, and the one place this port knowingly shows less
	 * than its tile labels promise.
	 *
	 * `GET /api/users/:id/general-info` sends **six** fields, not the ten
	 * React's `user.types.ts` declared (sub-feature 3 probed it live and
	 * `core-api/DTOs/general_user_info_dto.go` confirms it). Of the four
	 * numbers this grid wants, only the session count has a source:
	 * `total_entries`. `total_questions`, `average_npm` and `average_accuracy`
	 * are **never sent by any endpoint**.
	 *
	 * React read all four off the profile as `?? 0`, so its dashboard has
	 * always rendered four zeroes. Three of them still do, and deliberately:
	 * deriving NPM and accuracy from the chart series would be new behaviour,
	 * not a port. The sessions tile is wired to the real count because the
	 * field exists and is what the tile has always claimed to show.
	 */
	protected readonly stats = computed(() => {
		const user = this.profile.value();
		return {
			totalSessions: user?.totalEntries ?? 0,
			totalQuestions: 0,
			avgNPM: 0,
			avgAccuracy: 0,
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
