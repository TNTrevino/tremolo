import {
	HttpClient,
	HttpErrorResponse,
	HttpParams,
} from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { catchError, map, type Observable, of, throwError } from "rxjs";

import { environment } from "../../../environments/environment";
import type {
	ChartQueryParams,
	MultiMetricChartData,
} from "../models/chart.models";
import {
	type CreateGameEntryResponse,
	type DailyActivity,
	type DailyActivityDto,
	type GameEntry,
	type GameEntryDto,
	type GameSettings,
	type GameSettingsDto,
	type GameSettingsInput,
	type KeyBindings,
	type KeyboardBindings,
	type KeyboardBindingsDto,
	mapDailyActivity,
	mapGameEntry,
	mapGameSettings,
	mapKeyboardBindings,
	mapNoteGameSettings,
	type NoteGameSettings,
	type NoteGameSettingsDto,
	type NoteGameSettingsInput,
	type SaveGameResultParams,
	type SettingsGameType,
	toCreateGameEntryDto,
	toGameSettingsDto,
	toNoteGameSettingsDto,
} from "../models/game.models";
import {
	type GeneralUserInfoDto,
	mapGeneralUserInfo,
	type UserProfile,
} from "../models/user.models";

/**
 * Everything the Go service knows about a user: their profile, their score
 * entries, their chart metrics and their per-game settings.
 *
 * Port of frontend-react/src/services/api/user.service.ts. Three things
 * change and one must not:
 *
 * - **Observables, not Promises** (D5). Every method returns one, so a page
 *   can hand it straight to `rxResource` and get cancellation for free.
 * - **The mapping moved down a layer.** React returned raw DTOs and mapped
 *   inside `useUserProfile`'s fetch function; with that hook layer gone, the
 *   mapping belongs at the service boundary (phase-3.md, uniform rules), so
 *   nothing above this file ever sees a snake_case key.
 * - **The four dead methods are gone** -- `updateProfile`, `changePassword`,
 *   `deleteAccount` and `downloadUserData` addressed
 *   `PATCH/POST/DELETE/GET /api/users/...` routes the Go service does not
 *   register (`core-api/controllers/user_info_controller.go` mounts
 *   exactly one route). Nothing called them in React either, which is why
 *   the account page answers all three with a "coming soon" toast. See the
 *   handoff.
 * - **What must not change:** `assignment_id` is *omitted*, never nulled,
 *   for untagged play, and the settings endpoints answer "nothing saved"
 *   two different ways -- see `getOrNull`.
 *
 * No caching, no `shareReplay`, no dedup (D6). Two components asking for the
 * same profile make two requests, on purpose.
 */
@Injectable({ providedIn: "root" })
export class UserService {
	private readonly http = inject(HttpClient);
	private readonly base = environment.coreApi;

	// --- Profile ----------------------------------------------------------

	getProfile(userId: number): Observable<UserProfile> {
		return this.http
			.get<GeneralUserInfoDto>(`${this.base}/api/users/${userId}/general-info`)
			.pipe(map(mapGeneralUserInfo));
	}

	// --- Charts -----------------------------------------------------------

	getStats(
		userId: number,
		params?: ChartQueryParams,
	): Observable<MultiMetricChartData> {
		return this.http.get<MultiMetricChartData>(
			`${this.base}/api/charts/user/${userId}/metrics`,
			{ params: chartParams(params) },
		);
	}

	/** Teachers only; the Go route rejects anyone else. */
	getClassMetrics(params?: ChartQueryParams): Observable<MultiMetricChartData> {
		return this.http.get<MultiMetricChartData>(
			`${this.base}/api/charts/teacher/class-metrics`,
			{ params: chartParams(params) },
		);
	}

	// --- Score entries ----------------------------------------------------

	saveGameResult(
		params: SaveGameResultParams,
	): Observable<CreateGameEntryResponse> {
		return this.http.post<CreateGameEntryResponse>(
			`${this.base}/api/note-game/entry`,
			toCreateGameEntryDto(params),
		);
	}

	/** Newest first, up to 30. Callers wanting oldest-first reverse it. */
	getRecentGameEntries(): Observable<GameEntry[]> {
		return this.http
			.get<GameEntryDto[]>(`${this.base}/api/note-game/recent`)
			.pipe(map((rows) => rows.map(mapGameEntry)));
	}

	/** Daily game counts for the activity heatmap (last ~1 year). */
	getActivityHeatmap(): Observable<DailyActivity[]> {
		return this.http
			.get<DailyActivityDto[]>(`${this.base}/api/note-game/activity`)
			.pipe(map((rows) => rows.map(mapDailyActivity)));
	}

	// --- Note-game settings -----------------------------------------------

	getNoteGameSettings(): Observable<NoteGameSettings | null> {
		return this.getOrNull<NoteGameSettingsDto>(
			`${this.base}/api/note-game/settings`,
		).pipe(map((dto) => (dto ? mapNoteGameSettings(dto) : null)));
	}

	saveNoteGameSettings(
		settings: NoteGameSettingsInput,
	): Observable<NoteGameSettings> {
		return this.http
			.put<NoteGameSettingsDto>(
				`${this.base}/api/note-game/settings`,
				toNoteGameSettingsDto(settings),
			)
			.pipe(map(mapNoteGameSettings));
	}

	// --- Generic game settings --------------------------------------------

	getGameSettings(gameType: SettingsGameType): Observable<GameSettings | null> {
		return this.getOrNull<GameSettingsDto>(`${this.base}/api/game-settings`, {
			game_type: gameType,
		}).pipe(map((dto) => (dto ? mapGameSettings(dto) : null)));
	}

	saveGameSettings(settings: GameSettingsInput): Observable<GameSettings> {
		return this.http
			.put<GameSettingsDto>(
				`${this.base}/api/game-settings`,
				toGameSettingsDto(settings),
			)
			.pipe(map(mapGameSettings));
	}

	// --- Keyboard bindings ------------------------------------------------

	getKeyboardBindings(): Observable<KeyboardBindings | null> {
		return this.getOrNull<KeyboardBindingsDto>(
			`${this.base}/api/note-game/keyboard-bindings`,
		).pipe(map((dto) => (dto ? mapKeyboardBindings(dto) : null)));
	}

	/**
	 * `overlapAccidentals` is a second argument, not a 22nd binding: the Go
	 * service takes it beside `key_bindings`, and the dialog that edits the
	 * 21 keys knows nothing about it. The caller carries it through from the
	 * row it loaded, so saving keys never clears the layout.
	 */
	saveKeyboardBindings(
		bindings: KeyBindings,
		overlapAccidentals = false,
	): Observable<KeyboardBindings> {
		return this.http
			.put<KeyboardBindingsDto>(
				`${this.base}/api/note-game/keyboard-bindings`,
				{ key_bindings: bindings, overlap_accidentals: overlapAccidentals },
			)
			.pipe(map(mapKeyboardBindings));
	}

	/**
	 * GET an optional resource. "Nothing saved yet" arrives two ways and
	 * both mean `null`: a 404, or a 200 carrying the `{"settings": null}`
	 * sentinel. Carried over from React's private `getOrNull`, which is the
	 * only reason the settings pages do not treat a first-ever visit as an
	 * error.
	 *
	 * Any other failure is re-thrown, so a real 500 still reaches
	 * `rxResource`'s `error()` instead of masquerading as "no settings".
	 */
	private getOrNull<T>(
		url: string,
		params?: Record<string, string>,
	): Observable<T | null> {
		return this.http
			.get<T>(url, { params: new HttpParams({ fromObject: params ?? {} }) })
			.pipe(
				map((body) => (isNullSettingsSentinel(body) ? null : body)),
				catchError((error: unknown) =>
					error instanceof HttpErrorResponse && error.status === 404
						? of(null)
						: throwError(() => error),
				),
			);
	}
}

/**
 * `?interval=&days=` -- both optional, and an absent one is left off the
 * query string entirely rather than sent empty, exactly as React's
 * `URLSearchParams` build did.
 */
function chartParams(params?: ChartQueryParams): HttpParams {
	let httpParams = new HttpParams();
	if (params?.interval)
		httpParams = httpParams.set("interval", params.interval);
	if (params?.days !== undefined) {
		httpParams = httpParams.set("days", params.days.toString());
	}
	return httpParams;
}

function isNullSettingsSentinel(body: unknown): boolean {
	return (
		typeof body === "object" &&
		body !== null &&
		"settings" in body &&
		(body as { settings: unknown }).settings === null
	);
}
