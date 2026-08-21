import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, type Observable } from "rxjs";

import { environment } from "../../../environments/environment";
import type {
	ChartQueryParams,
	DailyActivityCount,
	MultiMetricChartData,
} from "../models/chart.models";
import type { GeneralUserInfo, UserProfile } from "../models/user.models";
import { mapGeneralUserInfo } from "../utils/user.mapper";

/**
 * Client for the Go "user tracking" service's user, chart and score-entry
 * endpoints. Port of frontend-react/src/services/api/user.service.ts.
 *
 * Observables in, Observables out (D5); snake_case -> camelCase mapping at
 * this boundary and nowhere else (PLAN.md 5.1). The bearer token and the
 * 401 refresh are the interceptors' job, so nothing here touches a header --
 * that is the whole of what the React `mainApiClient` axios instance did.
 *
 * **This file is shared and is filled in slice by slice.** Phase 3's
 * dashboard slice added the four reads below. The account slice adds the
 * profile mutations (`updateProfile`, `changePassword`, `deleteAccount`,
 * `downloadUserData`); Phases 5 and 6 add the settings and keyboard-binding
 * pairs, whose GETs need React's `getOrNull` sentinel handling (a
 * `{"settings": null}` body and a 404 both mean "none saved"). Add methods
 * here rather than starting a second user service.
 */
@Injectable({ providedIn: "root" })
export class UserService {
	private readonly http = inject(HttpClient);
	private readonly base = environment.mainApi;

	/**
	 * The profile the dashboard's header card and the account page read.
	 * Mapped to the domain shape on the way out.
	 */
	getProfile(userId: number): Observable<UserProfile> {
		return this.http
			.get<GeneralUserInfo>(`${this.base}/api/users/${userId}/general-info`)
			.pipe(map(mapGeneralUserInfo));
	}

	/** One user's performance series, bucketed by `params.interval`. */
	getStats(
		userId: number,
		params?: ChartQueryParams,
	): Observable<MultiMetricChartData> {
		return this.http.get<MultiMetricChartData>(
			`${this.base}/api/charts/user/${userId}/metrics`,
			{ params: chartParams(params) },
		);
	}

	/**
	 * The same series aggregated across every class the caller teaches.
	 * 403s for a student, which is why only the teacher branch asks for it.
	 */
	getClassMetrics(params?: ChartQueryParams): Observable<MultiMetricChartData> {
		return this.http.get<MultiMetricChartData>(
			`${this.base}/api/charts/teacher/class-metrics`,
			{ params: chartParams(params) },
		);
	}

	/** Daily game counts for roughly the last year -- the heatmap's data. */
	getActivityHeatmap(): Observable<DailyActivityCount[]> {
		return this.http.get<DailyActivityCount[]>(
			`${this.base}/api/note-game/activity`,
		);
	}
}

/**
 * React built this query string by hand with `URLSearchParams`, appending
 * each key only when it was set. `HttpParams` is the same contract: an
 * absent key must not appear at all, because the Go handler distinguishes
 * "no `days`" from `days=0`.
 */
function chartParams(params?: ChartQueryParams): HttpParams {
	let httpParams = new HttpParams();
	if (params?.interval) {
		httpParams = httpParams.set("interval", params.interval);
	}
	if (params?.days) {
		httpParams = httpParams.set("days", String(params.days));
	}
	return httpParams;
}
