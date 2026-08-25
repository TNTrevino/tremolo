import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	signal,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { NgIcon } from "@ng-icons/core";

import { AppErrorComponent } from "../../../../core/components/app-error/app-error.component";
import type {
	ChartInterval,
	MultiMetricChartData,
} from "../../../../shared/models/chart.models";
import { UserService } from "../../../../shared/services/user.service";
import { formatTimeReading } from "../../../../shared/utils/date.utils";
import { PerformanceChartComponent } from "../../../dashboard/components/performance-chart/performance-chart.component";
import { UserProfileCardComponent } from "../../../dashboard/components/user-profile-card/user-profile-card.component";

/**
 * `/classes/:id/students/:studentId` -- a teacher's read-only view of one
 * enrolled student's stats: profile card + personal performance chart.
 * Reuses the same cards the student's own dashboard renders
 * (`app-user-profile-card`, `app-performance-chart`) rather than forking
 * new ones. No heatmap and no `DashboardStatsComponent` here -- there is
 * no per-user heatmap or recent-entries route to call even if there were.
 *
 * `id` (the class the visit came from) is navigational context ONLY -- it
 * drives the back link and nothing else. The access rule these requests
 * ride on is per-teacher, not per-class:
 * `services.RequireUserStatsAccess` on the Go side asks "does the caller
 * own *an* active class this student is enrolled in?", not "do they own
 * *this* class." A teacher who removes the student from this particular
 * class but still shares another class with them keeps access; this page
 * does not re-derive or narrow that rule, and a non-owning teacher who
 * guesses a studentId still gets the server's 403 via the error arm below.
 *
 * The template ladder follows class-detail-page's shape: back link,
 * loading spinner, error, value, not-found -- and, per the repo's own
 * rule, branches on `status() === "loading"`, never `isLoading()`, so a
 * chart interval change re-renders instead of tearing the page down
 * mid-refetch.
 */
@Component({
	selector: "app-student-stats-page",
	imports: [
		AppErrorComponent,
		NgIcon,
		PerformanceChartComponent,
		RouterLink,
		UserProfileCardComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./student-stats-page.component.html",
})
export class StudentStatsPageComponent {
	readonly id = input.required<string>();
	readonly studentId = input.required<string>();

	private readonly users = inject(UserService);

	readonly classId = computed(() => Number(this.id()));
	readonly userId = computed(() => Number(this.studentId()));

	readonly interval = signal<ChartInterval>("day");

	readonly profile = rxResource({
		params: () => (Number.isNaN(this.userId()) ? undefined : this.userId()),
		stream: ({ params }) => this.users.getProfile(params),
	});

	readonly chart = rxResource({
		params: () => {
			if (Number.isNaN(this.userId())) return undefined;
			return {
				id: this.userId(),
				interval: this.interval(),
				days: this.interval() === "day" ? 30 : undefined,
			};
		},
		stream: ({ params }) =>
			this.users.getStats(params.id, {
				interval: params.interval,
				days: params.days,
			}),
	});

	/**
	 * `hasValue()` rather than a bare `profile.value()` read: `.value()`
	 * rethrows once the resource has errored, and this computed must not
	 * throw before the template's own error arm gets a chance to render.
	 */
	readonly timeReading = computed(() => {
		const profile = this.profile.hasValue() ? this.profile.value() : undefined;
		return formatTimeReading(profile?.totalEntries ?? 0);
	});

	readonly EMPTY_CHART: MultiMetricChartData = {
		npm: [],
		accuracy: [],
		sessionCount: [],
		totalQuestions: [],
	};
}
